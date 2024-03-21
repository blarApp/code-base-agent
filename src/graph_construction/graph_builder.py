from llama_index.core import SimpleDirectoryReader
from llama_index.core.text_splitter import CodeSplitter
from llama_index.llms.openai import OpenAI
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from llama_index.core.schema import NodeRelationship
from neo4j_manager import Neo4jManager
from pathlib import Path

import os
import uuid


class GraphConstructor:
    NODES_NAME_MAP = {
        "file": "FILE",
        "function_definition": "FUNCTION",
        "class_definition": "CLASS",
    }

    RELATIONS_TYPES_MAP = {
        "function_definition": "FUNCTION_DEFINITION",
        "class_definition": "CLASS_DEFINITION",
    }

    def __init__(self, graph_manager: Neo4jManager):
        self.graph_manager = graph_manager

    def __process_node__(self, node):
        relationships = []
        for relation in node.relationships.items():
            if relation[0] == NodeRelationship.CHILD:
                for child in relation[1]:
                    relation_type = (
                        child.metadata["inclusive_scopes"][-1]["type"]
                        if child.metadata["inclusive_scopes"]
                        else ""
                    )
                    relationships.append(
                        {
                            "sourceId": node.node_id,
                            "targetId": child.node_id,
                            "type": self.RELATIONS_TYPES_MAP.get(
                                relation_type, "UNKNOWN"
                            ),
                        }
                    )

        scope = (
            node.metadata["inclusive_scopes"][-1]
            if node.metadata["inclusive_scopes"]
            else None
        )
        type_node = "file"
        name = ""
        signature = ""
        if scope:
            name = scope["name"]
            signature = scope["signature"]
            type_node = scope["type"]

        processed_node = {
            "type": self.NODES_NAME_MAP.get(type_node, "UNKNOWN"),
            "attributes": {
                "name": name,
                "signature": signature,
                "text": node.text,
                "node_id": node.node_id,
            },
        }
        if type_node == "file":
            processed_node["attributes"]["language"] = node.metadata["language"]
        return processed_node, relationships

    def scan_directory(self, path, nodes=[], relationships=[], parent_id=None):
        package = False
        init_py_path = os.path.join(path, "__init__.py")
        if os.path.exists(init_py_path):
            package = True
        node_type = "Package" if package else "Folder"
        directory_node = {
            "type": node_type,
            "attributes": {
                "path": path,
                "name": os.path.basename(path),
                "node_id": str(uuid.uuid4()),
            },
        }
        if parent_id is not None:
            relationships.append(
                {
                    "sourceId": parent_id,
                    "targetId": directory_node["node_id"],
                    "type": "contains",
                }
            )
        nodes.append(directory_node)
        for entry in os.scandir(path):
            if entry.is_file():
                if entry.name.endswith(".py") and not entry.name == ("__init__.py"):
                    # imports, function_imports, relative_imports = get_imports(entry.path)
                    node_list, edge_list = self.process_file(entry.path)
                    nodes.extend(node_list)
                    relationships.extend(edge_list)
                    relationships.append(
                        {
                            "sourceId": directory_node["node_id"],
                            "targetId": node_list[0]["node_id"],
                            "type": "contains",
                        }
                    )
                else:
                    file_node = {
                        "type": "File",
                        "attributes": {
                            "path": entry.path,
                            "name": entry.name,
                            "node_id": str(uuid.uuid4()),
                        },
                    }
                    nodes.append(file_node)
                    relationships.append(
                        {
                            "sourceId": directory_node["node_id"],
                            "targetId": file_node["node_id"],
                            "type": "contains",
                        }
                    )
            if entry.is_dir():
                nodes, relationships = self.scan_directory(
                    entry.path, nodes, relationships, directory_node["node_id"]
                )
        return nodes, relationships

    def build_graph(self, path):
        nodes, relationships = self.scan_directory(path)
        self.graph_manager.create_nodes(nodes)
        self.graph_manager.create_relationships(relationships)

    def process_file(self, file_path, languaje):
        path = Path(file_path)
        if not path.exists():
            print(f"File {file_path} does not exist.")
            return
        documents = SimpleDirectoryReader(
            input_files=[path],
            file_metadata=lambda x: {"filepath": x},
        ).load_data()

        code = CodeHierarchyNodeParser(
            language=languaje,
            chunk_min_characters=3,
            code_splitter=CodeSplitter(
                language=languaje, max_chars=1000, chunk_lines=10
            ),
        )

        split_nodes = code.get_nodes_from_documents(documents)
        node_list = []
        edges_list = []
        for node in split_nodes:
            processed_node, relationships = self.__process_node__(node)
            node_list.append(processed_node)
            edges_list.extend(relationships)
        return node_list, edges_list


if __name__ == "__main__":
    graph_manager = Neo4jManager()
    graph_constructor = GraphConstructor(graph_manager)
    graph_constructor.build_graph(".", "python")
    graph_manager.close()
