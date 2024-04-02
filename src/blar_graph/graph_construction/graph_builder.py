import os
import uuid
from blar_graph.db_managers import Neo4jManager
from blar_graph.utils import format_nodes
from blar_graph.graph_construction.language_classes.python import PythonFile


class GraphConstructor:
    LANGUAGE_CLASS_MAP = {
        "python": PythonFile,
    }

    def __init__(self, graph_manager: Neo4jManager):
        self.graph_manager = graph_manager
        self.directories_map = {}
        self.visited_nodes = {}
        self.global_imports = {}
        self.import_aliases = {}
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
        LanguageClass = self.LANGUAGE_CLASS_MAP.get(language)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Directory {path} not found")
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
            if "legacy" in entry.name:
                continue
            if entry.is_file():
                if entry.name.endswith(".py"):
                    file_parser = LanguageClass(
                        entry.path,
                        self.root,
                        directory_path,
                        visited_nodes=self.visited_nodes,
                        global_imports=self.global_imports,
                    )
                    entry_name = entry.name.split(".py")[0]
                    try:
                        processed_nodes, relations, file_imports = file_parser.parse_file()
                    except Exception:
                        print(f"\rError {entry.path}", end="")
                        continue
                    print(f"\rProcessed {entry.path}", end="")
                    if not processed_nodes:
                        self.import_aliases.update(file_imports)
                        continue
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
            for imp, path in imports[file_node_id].items():
                import_alias = self.import_aliases.get(f"{path}.{imp}")
                targetId = self.global_imports.get(f"{path}.{imp}")
                if not targetId and import_alias:
                    targetId = self.global_imports.get(import_alias)
                if targetId:
                    import_edges.append(
                        {
                            "sourceId": file_node_id,
                            "targetId": targetId["id"],
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
                        file_imports = imports.get(node["attributes"]["node_id"], {})
                    else:
                        file_imports = imports.get(node["attributes"]["file_node_id"], {})

                    function_import = file_imports.get(function_call.split(".")[0])
                    root_directory = node["attributes"]["path"].replace("." + node["attributes"]["name"], "")
                    directory = root_directory
                    if function_import:
                        # Change the directory to complete path if it's an alias else it's assumed to be a regular import
                        directory = self.import_aliases.get(
                            function_import + "." + function_call.split(".")[0], function_import
                        )

                    for module in function_call.split("."):
                        final_module = "." + module
                        intermediate_module = "." + module + "."
                        if not (final_module in directory or intermediate_module in directory):
                            directory += f".{module}"
                    target_node = self.global_imports.get(directory)
                    if target_node:
                        target_node_type = target_node["type"]
                        if target_node_type == "FUNCTION" or target_node_type == "FILE":
                            function_calls_relations.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": target_node["id"],
                                    "type": "CALLS",
                                }
                            )
                        elif target_node_type == "CLASS":
                            function_calls_relations.append(
                                {
                                    "sourceId": node["attributes"]["node_id"],
                                    "targetId": target_node["id"],
                                    "type": "INSTANTIATES",
                                }
                            )

                            init_directory = directory + ".__init__"
                            if os.path.exists(init_directory + ".py"):
                                function_calls_relations.append(
                                    {
                                        "sourceId": node["attributes"]["node_id"],
                                        "targetId": target_node["id"],
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

        self.graph_manager.save_graph(nodes, relationships)
