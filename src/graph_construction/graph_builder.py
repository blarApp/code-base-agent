import os
import uuid
from pathlib import Path
import tree_sitter_languages
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import NodeRelationship, BaseNode
from llama_index.core.text_splitter import CodeSplitter
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from graph_construction.neo4j_manager import Neo4jManager
from utils import format_nodes


class GraphConstructor:
    RELATIONS_TYPES_MAP = {
        "function_definition": "FUNCTION_DEFINITION",
        "class_definition": "CLASS_DEFINITION",
    }

    def __init__(self, graph_manager: Neo4jManager):
        self.graph_manager = graph_manager
        self.directories_map = {}
        self.global_imports = {}

    def _process_file(self, file_path, languaje, directory_path):
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
        imports, _, _ = self._get_imports(path)

        node_list[0]["attributes"]["directory"] = directory_path
        node_list[0]["imports"] = imports
        node_list[0]["attributes"]["name"] = os.path.basename(file_path)

        return node_list, edges_list

    def __process_node__(self, node: BaseNode):
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
        if scope:
            type_node = scope["type"]

        if type_node == "function_definition":
            processed_node = format_nodes.format_function_node(node, scope)
        elif type_node == "class_definition":
            processed_node = format_nodes.format_class_node(node, scope)
        else:
            processed_node = format_nodes.format_file_node(node)

        self.global_imports[processed_node.get("attributes", {}).get("name")] = (
            processed_node.get("attributes", {}).get("node_id")
        )

        return processed_node, relationships

    def _get_directories_map(self, path):
        self.directories_map = {}
        for entry in os.scandir(path):
            self.directories_map[entry.name] = entry.path
            if entry.is_dir():
                self._get_directories_map(entry.path)

    def _scan_directory(
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

        directory_node = format_nodes.format_directory_node(path, package)
        directory_path = directory_node["attributes"]["path"]
        directory_node_id = directory_node["attributes"]["node_id"]
        directory_name = directory_node["attributes"]["name"]
        path_basename = os.path.basename(path)

        if package:
            imports_dict[path_basename] = directory_node_id
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
                        entry.path, languaje, directory_node["attributes"]["path"]
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
                    if package:
                        imports_dict[directory_name + "." + entry_name] = (
                            file_root_node_id
                        )
                    imports_dict[directory_path + entry_name] = file_root_node_id
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
                nodes, relationships, imports_dict = self._scan_directory(
                    entry.path,
                    languaje,
                    nodes,
                    relationships,
                    directory_node_id,
                    imports_dict,
                )
        return nodes, relationships, imports_dict

    def _relate_imports(self, node_list, imports_dict):
        import_edges = []
        for node in node_list:
            if node.get("imports"):
                for imp in node["imports"]:
                    if node["attributes"]["directory"] + imp in imports_dict:
                        import_edges.append(
                            {
                                "sourceId": node["attributes"]["node_id"],
                                "targetId": imports_dict[
                                    node["attributes"]["directory"] + imp
                                ],
                                "type": "IMPORTS",
                            }
                        )
                        print("added edge", node["attributes"]["directory"] + imp)
                    elif imp in imports_dict:
                        import_edges.append(
                            {
                                "sourceId": node["attributes"]["node_id"],
                                "targetId": imports_dict[imp],
                                "type": "IMPORTS",
                            }
                        )
                        print("added edge", imp)
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
                            imports.add(child.text.decode())
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
        function_calls = []
        for node in node_list:
            function_calls = node["attributes"]["function_calls"]
            if function_calls:
                # for call in function_calls:
                #     if call in imports_dict:
                #         function_calls.append(
                #             {
                #                 "sourceId": node["attributes"]["node_id"],
                #                 "targetId": imports_dict[call],
                #                 "type": "CALLS",
                #             }
                #         )
                #         print("added edge", call)
                del node["function_calls"]

        return function_calls

<<<<<<< HEAD
        split_nodes = code.get_nodes_from_documents(documents)
        node_list = []
        edges_list = []
        for node in split_nodes:
            processed_node, relationships = self.__process_node__(node)
            node_list.append(processed_node)
            edges_list.extend(relationships)
        imports, _ = self.get_imports(path)
=======
    def build_graph(self, path, languaje):
        # get directories map and save it in self.directories_map
        self._get_directories_map(path)
>>>>>>> dev

        # process every node to create the graph structure
        nodes, relationships, imports_dict = self._scan_directory(path, languaje)
        # relate imports between file nodes
        relationships.extend(self._relate_imports(nodes, imports_dict))
        # relate functions calls
        # relationships.extend(self._relate_function_calls(nodes))

        self.graph_manager.create_nodes(nodes)
        self.graph_manager.create_edges(relationships)


if __name__ == "__main__":
    graph_manager = Neo4jManager()
    graph_constructor = GraphConstructor(graph_manager)
    graph_constructor.build_graph("src", "python")
    graph_manager.close()
