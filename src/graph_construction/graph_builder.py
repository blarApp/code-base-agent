import os
import uuid
from pathlib import Path

import tree_sitter_languages
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import NodeRelationship
from llama_index.core.text_splitter import CodeSplitter
from llama_index.llms.openai import OpenAI
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from neo4j_manager import Neo4jManager


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
                        child.metadata["inclusive_scopes"][-1]["type"] if child.metadata["inclusive_scopes"] else ""
                    )
                    relationships.append(
                        {
                            "sourceId": node.node_id,
                            "targetId": child.node_id,
                            "type": self.RELATIONS_TYPES_MAP.get(relation_type, "UNKNOWN"),
                        }
                    )

        scope = node.metadata["inclusive_scopes"][-1] if node.metadata["inclusive_scopes"] else None
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

    def scan_directory(
        self,
        path,
        languaje="python",
        nodes=[],
        relationships=[],
        parent_id=None,
        imports_dict={},
    ):
        package = False
        init_py_path = os.path.join(path, "__init__.py")
        if os.path.exists(init_py_path):
            package = True
        directory_node = {
            "attributes": {
                "path": path + "/",
                "name": os.path.basename(path),
                "node_id": str(uuid.uuid4()),
            },
            "type": "Package" if package else "Folder",
        }
        if package:
            imports_dict[os.path.basename(path)] = directory_node["attributes"]["node_id"]
        if parent_id is not None:
            relationships.append(
                {
                    "sourceId": parent_id,
                    "targetId": directory_node["attributes"]["node_id"],
                    "type": "contains",
                }
            )

        nodes.append(directory_node)
        for entry in os.scandir(path):
            if entry.is_file():
                if entry.name.endswith(".py") and not entry.name == ("__init__.py"):
                    # imports, function_imports, relative_imports = get_imports(entry.path)
                    entry_name = entry.name.split(".py")[0]
                    node, relations, imports = self.process_file(entry.path, languaje)
                    node[0]["attributes"]["directory"] = directory_node["attributes"]["path"]
                    node[0]["imports"] = imports
                    node[0]["attributes"]["name"] = os.path.basename(entry.path)
                    nodes.extend(node)
                    relationships.extend(relations)
                    relationships.append(
                        {
                            "sourceId": directory_node["attributes"]["node_id"],
                            "targetId": node[0]["attributes"]["node_id"],
                            "type": "contains",
                        }
                    )
                    if package:
                        imports_dict[directory_node["attributes"]["name"] + "." + entry_name] = node[0]["attributes"][
                            "node_id"
                        ]
                    imports_dict[directory_node["attributes"]["path"] + entry_name] = node[0]["attributes"]["node_id"]
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
                            "sourceId": directory_node["attributes"]["node_id"],
                            "targetId": file_node["attributes"]["node_id"],
                            "type": "contains",
                        }
                    )
            if entry.is_dir():
                nodes, relationships, imports_dict = self.scan_directory(
                    entry.path,
                    languaje,
                    nodes,
                    relationships,
                    directory_node["attributes"]["node_id"],
                    imports_dict,
                )
        return nodes, relationships, imports_dict

    def build_graph(self, path, languaje):
        nodes, relationships, imports_dict = self.scan_directory(path, languaje)
        relationships.extend(self.relate_imports(nodes, imports_dict))

        self.graph_manager.create_nodes(nodes)
        self.graph_manager.create_edges(relationships)

    def relate_imports(self, node_list, imports_dict):
        import_edges = []
        for node in node_list:
            if node.get("imports"):
                for imp in node["imports"]:
                    if node["attributes"]["directory"] + imp in imports_dict:
                        import_edges.append(
                            {
                                "sourceId": node["attributes"]["node_id"],
                                "targetId": imports_dict[node["attributes"]["directory"] + imp],
                                "type": "Imports",
                            }
                        )
                        print("added edge", node["attributes"]["directory"] + imp)
                    elif imp in imports_dict:
                        import_edges.append(
                            {
                                "sourceId": node["attributes"]["node_id"],
                                "targetId": imports_dict[imp],
                                "type": "Imports",
                            }
                        )
                        print("added edge", imp)
                del node["imports"]

        return import_edges

    def get_imports(self, path):
        parser = tree_sitter_languages.get_parser("python")
        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = set()
        function_imports = set()
        relative_imports = set()
        for node in tree.root_node.children:
            if node.type == "import_from_statement":
                from_import = True
                for child in node.children:
                    if from_import:
                        if child.type == "dotted_name":
                            imports.add(child.text.decode())
                            from_import = False
                        elif child.type == "relative_import":
                            relative_imports.add(child.text.decode())
                            from_import = False

                    else:
                        if child.type == "dotted_name":
                            function_imports.add(child.text.decode())

            elif node.type == "import_statement":
                for child in node.children:
                    if child.type == "dotted_name":
                        imports.add(child.text.decode())
        return imports, function_imports, relative_imports

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
            code_splitter=CodeSplitter(language=languaje, max_chars=1000, chunk_lines=10),
        )

        split_nodes = code.get_nodes_from_documents(documents)
        node_list = []
        edges_list = []
        for node in split_nodes:
            processed_node, relationships = self.__process_node__(node)
            node_list.append(processed_node)
            edges_list.extend(relationships)
        imports, _, _ = self.get_imports(path)

        return node_list, edges_list, imports


if __name__ == "__main__":
    graph_manager = Neo4jManager()
    graph_constructor = GraphConstructor(graph_manager)
    graph_constructor.build_graph("src", "python")
    graph_manager.close()
