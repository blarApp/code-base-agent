import os
import uuid
from blar_graph.graph_construction.neo4j_manager import Neo4jManager
from blar_graph.graph_construction.graph_file_parser import GraphFileParser
from blar_graph.utils import format_nodes


class GraphConstructor:
    def __init__(self, graph_manager: Neo4jManager):
        self.graph_manager = graph_manager
        self.directories_map = {}
        self.visited_nodes = {}
        self.global_imports = {}
        self.root = None

    def _scan_directory(
        self,
        path,
        language="python",
        nodes=[],
        relationships=[],
        imports={},
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
                    "type": "CONTAINS",
                }
            )

        nodes.append(directory_node)
        for entry in os.scandir(path):
            if entry.is_file():
                if entry.name.endswith(".py") and not entry.name == ("__init__.py"):
                    file_parser = GraphFileParser(
                        entry.path,
                        self.root,
                        language,
                        directory_path,
                        visited_nodes=self.visited_nodes,
                        global_imports=self.global_imports,
                    )

                    entry_name = entry.name.split(".py")[0]
                    processed_nodes, relations, file_imports = file_parser.parse()
                    file_root_node_id = processed_nodes[0]["attributes"]["node_id"]

                    nodes.extend(processed_nodes)
                    relationships.extend(relations)
                    relationships.append(
                        {
                            "sourceId": directory_node_id,
                            "targetId": file_root_node_id,
                            "type": "CONTAINS",
                        }
                    )
                    imports.update(file_imports)

                    global_import_key = (directory_path + entry_name).replace("/", ".")
                    self.global_imports[global_import_key] = {
                        "id": file_root_node_id,
                        "type": "FILE",
                    }
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
                if entry.name == "__pycache__":
                    continue
                nodes, relationships, imports = self._scan_directory(
                    entry.path,
                    language,
                    nodes,
                    relationships,
                    imports,
                    directory_node_id,
                )
        return nodes, relationships, imports

    def _relate_imports(self, imports: dict):
        import_edges = []
        for file_node_id in imports.keys():
            for imp in imports[file_node_id].keys():
                for key in self.global_imports.keys():
                    if key.endswith(imp):
                        import_edges.append(
                            {
                                "sourceId": file_node_id,
                                "targetId": self.global_imports[key]["id"],
                                "type": "IMPORTS",
                            }
                        )

        return import_edges

    def _relate_function_calls(self, node_list, imports):
        function_calls_relations = []
        for node in node_list:
            function_calls = node["attributes"].get("function_calls")
            if function_calls:
                for function_call in function_calls:
                    if node["type"] == "FILE":
                        file_imports = imports[node["attributes"]["node_id"]]
                    else:
                        file_imports = imports[node["attributes"]["file_node_id"]]

                    function_import = file_imports.get(function_call.split(".")[0])
                    root_directory = node["attributes"]["path"].replace(
                        "." + node["attributes"]["name"], ""
                    )
                    directory = root_directory
                    if function_import:
                        directory = function_import

                    for module in function_call.split("."):
                        final_module = "." + module
                        intermediate_module = "." + module + "."
                        if not (
                            final_module in directory
                            or intermediate_module in directory
                        ):
                            directory += f".{module}"
                    if directory in self.global_imports:
                        target_node_type = self.global_imports[directory]["type"]
                        if target_node_type == "FUNCTION" or target_node_type == "FILE":
                            function_calls_relations.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": self.global_imports[directory]["id"],
                                    "type": "CALLS",
                                }
                            )
                        elif target_node_type == "CLASS":
                            function_calls_relations.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": self.global_imports[directory]["id"],
                                    "type": "INSTANTIATES",
                                }
                            )

                            init_directory = directory + ".__init__"
                            function_calls_relations.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": self.global_imports[init_directory][
                                        "id"
                                    ],
                                    "type": "CALLS",
                                }
                            )

        return function_calls_relations

    def build_graph(self, path, language):
        # process every node to create the graph structure
        nodes, relationships, imports = self._scan_directory(path, language)
        # relate imports between file nodes
        relationships.extend(self._relate_imports(imports))
        # relate functions calls
        relationships.extend(self._relate_function_calls(nodes, imports))

        self.graph_manager.create_nodes(nodes)
        self.graph_manager.create_edges(relationships)
