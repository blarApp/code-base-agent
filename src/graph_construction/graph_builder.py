import os
import uuid
from pathlib import Path
import tree_sitter_languages
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import NodeRelationship, BaseNode
from llama_index.core.text_splitter import CodeSplitter
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from graph_construction.neo4j_manager import Neo4jManager
from utils import format_nodes, tree_parser

class GraphConstructor:
    RELATIONS_TYPES_MAP = {
        "function_definition": "FUNCTION_DEFINITION",
        "class_definition": "CLASS_DEFINITION",
    }

    def __init__(self, graph_manager: Neo4jManager):
        self.graph_manager = graph_manager
        self.directories_map = {}
        self.visited_nodes = {}
        self.global_imports = {}
        self.root = None

    def _process_file(self, file_path, language, directory_path):
        path = Path(file_path)
        if not path.exists():
            print(f"File {file_path} does not exist.")
            return
        documents = SimpleDirectoryReader(
            input_files=[path],
            file_metadata=lambda x: {"filepath": x},
        ).load_data()

        code = CodeHierarchyNodeParser(
            language=language,
            chunk_min_characters=3,
            code_splitter=CodeSplitter(
                language=language, max_chars=10000, chunk_lines=10
            ),
        )
        no_extension_path = file_path.replace(".py", "")

        split_nodes = code.get_nodes_from_documents(documents)
        node_list = []
        edges_list = []
        for node in split_nodes:
            processed_node, relationships = self.__process_node__(node, no_extension_path)
            node_list.append(processed_node)
            edges_list.extend(relationships)
        imports, _ = self._get_imports(path)

        node_list[0]["attributes"]["directory"] = directory_path
        node_list[0]["imports"] = imports
        node_list[0]["attributes"]["name"] = os.path.basename(file_path)

        return node_list, edges_list

    def __process_node__(self, node: BaseNode, no_extension_path: str):
        relationships = []
        scope = (
            node.metadata["inclusive_scopes"][-1]
            if node.metadata["inclusive_scopes"]
            else None
        )
        type_node = "file"
        if scope:
            type_node = scope["type"]

        if type_node == "function_definition":
            function_calls = tree_parser.get_function_calls(node)
            processed_node = format_nodes.format_function_node(
                node, scope, function_calls
            )
        elif type_node == "class_definition":
            processed_node = format_nodes.format_class_node(node, scope)
        else:
            processed_node = format_nodes.format_file_node(node)

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
            elif relation[0] == NodeRelationship.PARENT:
                if relation[1]:
                    parent_path = self.visited_nodes.get(relation[1].node_id, no_extension_path).replace("/", ".")
                    node_path = f"{parent_path}.{processed_node['attributes']['name']}"
                else:
                    node_path = no_extension_path.replace("/", ".")
        processed_node['attributes']["path"] = node_path
        self.global_imports[node_path] = node.node_id
        self.visited_nodes[node.node_id] = node_path
        return processed_node, relationships

    def _scan_directory(
        self,
        path,
        language="python",
        nodes=[],
        relationships=[],
        parent_id=None,
    ):
        if self.root is None:
            self.root = path
        package = False
        init_py_path = os.path.join(path, "__init__.py")
        if os.path.exists(init_py_path):
            package = True

        directory_node = format_nodes.format_directory_node(path, package)
        directory_path = directory_node["attributes"]["path"]
        directory_node_id = directory_node["attributes"]["node_id"]

        if parent_id is not None:
            relationships.append(
                {
                    "sourceId": parent_id,
                    "targetId": directory_node_id,
                    "type": "contains",
                }
            )

        nodes.append(directory_node)
        for entry in os.scandir(path):
            if entry.is_file():
                if entry.name.endswith(".py") and not entry.name == ("__init__.py"):
                    entry_name = entry.name.split(".py")[0]
                    processed_nodes, relations = self._process_file(
                        entry.path, language, directory_node["attributes"]["path"]
                    )
                    file_root_node_id = processed_nodes[0]["attributes"]["node_id"]

                    nodes.extend(processed_nodes)
                    relationships.extend(relations)
                    relationships.append(
                        {
                            "sourceId": directory_node_id,
                            "targetId": file_root_node_id,
                            "type": "contains",
                        }
                    )
                    global_import_key = (directory_path + entry_name).replace("/", ".")
                    self.global_imports[global_import_key] = file_root_node_id
                else:
                    file_node = {
                        "type": "FILE",
                        "attributes": {
                            "path": entry.path,
                            "name": entry.name,
                            "node_id": str(uuid.uuid4()),
                        },
                    }
                    nodes.append(file_node)
                    relationships.append(
                        {
                            "sourceId": directory_node_id,
                            "targetId": file_node["attributes"]["node_id"],
                            "type": "CONTAINS",
                        }
                    )
            if entry.is_dir():
                nodes, relationships = self._scan_directory(
                    entry.path,
                    language,
                    nodes,
                    relationships,
                    directory_node_id,
                )
        return nodes, relationships

    def _relate_imports(self, node_list):
        import_edges = []
        for node in node_list:
            if node.get("imports") is not None:
                for imp in node["imports"]:
                    for key in self.global_imports.keys():
                        if key.endswith(imp):
                            import_edges.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": self.global_imports[key],
                                    "type": "IMPORTS",
                                }
                            )
                            print("added edge", key)
                del node["imports"]

        return import_edges


    def _get_imports(self, path):
        parser = tree_sitter_languages.get_parser("python")
        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = set()
        relative_imports = set()
        for node in tree.root_node.children:
            if node.type == "import_from_statement":
                from_import = ""
                for child in node.children:
                    if not from_import:
                        if child.type == "dotted_name":
                            from_import = child.text.decode()
                        elif child.type == "relative_import":
                            relative_imports.add(child.text.decode())
                            from_import = child.text.decode()

                    else:
                        if child.type == "dotted_name":
                            imports.add(f"{from_import}.{child.text.decode()}")

            elif node.type == "import_statement":
                for child in node.children:
                    if child.type == "dotted_name":
                        imports.add(child.text.decode())
        return imports, relative_imports

    def _relate_function_calls(self, node_list):
        function_calls_relations = []
        for node in node_list:
            function_calls = node["attributes"].get("function_calls")
            if function_calls:
                for call in function_calls:
                    for key in self.global_imports.keys():
                        if key.endswith(call):
                            function_calls_relations.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": self.global_imports[key],
                                    "type": "CALLS",
                                }
                            )
                            print("added edge", call)
                del node["attributes"]["function_calls"]

        return function_calls_relations

    def build_graph(self, path, language):

        # process every node to create the graph structure
        nodes, relationships = self._scan_directory(path, language)
        # relate imports between file nodes
        relationships.extend(self._relate_imports(nodes))
        # relate functions calls
        relationships.extend(self._relate_function_calls(nodes))

        self.graph_manager.create_nodes(nodes)
        self.graph_manager.create_edges(relationships)


if __name__ == "__main__":
    graph_manager = Neo4jManager()
    graph_constructor = GraphConstructor(graph_manager)
    graph_constructor.build_graph("src", "python")
    graph_manager.close()
