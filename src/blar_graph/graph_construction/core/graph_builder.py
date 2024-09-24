import os
import time
import traceback
from typing import List

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.languages.base_parser import BaseParser
from blar_graph.graph_construction.languages.Parsers import Parsers
from blar_graph.graph_construction.utils import format_nodes
from blar_graph.graph_construction.utils.interfaces.GlobalGraphInfo import (
    GlobalGraphInfo,
)


class GraphConstructor:
    graph_manager: Neo4jManager
    global_graph_info: GlobalGraphInfo
    root: str
    skip_tests: bool
    parsers: Parsers

    def __init__(self, graph_manager: Neo4jManager, entity_id: str, root: str):
        self.graph_manager = graph_manager
        self.global_graph_info = GlobalGraphInfo(entity_id=entity_id)
        self.parsers = Parsers(self.global_graph_info, root)
        self.root = root
        self.skip_tests = True

    def _skip_file(self, path: str) -> bool:
        # skip lock files
        if path.endswith("lock") or path == "package-lock.json" or path == "yarn.lock":
            return True
        # skip tests and legacy directories
        if path in ["legacy", "test"] and self.skip_tests:
            return True
        # skip hidden directories
        if path.startswith("."):
            return True
        return False

    def _skip_directory(self, directory: str) -> bool:
        return directory == "__pycache__" or directory == "node_modules"

    def _scan_directory(
        self,
        path: str,
        nodes: list = None,
        relationships: list = None,
        imports: dict = None,
        parent_id: str = None,
        level: int = 0,
    ):
        if nodes is None:
            nodes = []
        if relationships is None:
            relationships = []
        if imports is None:
            imports = {}

        if not os.path.exists(path):
            raise FileNotFoundError(f"Directory {path} not found")
        if path.endswith("tests") or path.endswith("test"):
            return nodes, relationships, imports

        # Check if the directory is a package, logic for python
        package = BaseParser.is_package(path)

        core_directory_node = format_nodes.format_directory_node(path, package, level)
        directory_node_id = BaseParser.generate_node_id(path, self.global_graph_info.entity_id)

        directory_node = {
            **core_directory_node,
            "attributes": {**core_directory_node["attributes"], "node_id": directory_node_id},
        }

        directory_path = core_directory_node["attributes"]["path"]

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
            if self._skip_file(entry.name):
                continue
            if entry.is_file():
                parser: BaseParser | None = self.parsers.get_parser(entry.name)
                # If the file is a supported language, parse it
                if parser:
                    entry_name = entry.name.split(parser.extension)[0]
                    try:
                        processed_nodes, relations, file_imports = parser.parse_file(
                            entry.path,
                            self.root,
                            global_graph_info=self.global_graph_info,
                            level=level,
                        )
                    except Exception:
                        print(f"Error {entry.path}")
                        print(traceback.format_exc())
                        continue
                    if not processed_nodes:
                        self.global_graph_info.import_aliases.update(file_imports)
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
                    self.global_graph_info.imports[global_import_key] = {
                        "id": file_root_node_id,
                        "type": "FILE",
                        "node": processed_nodes[0],
                    }
                # If the file is not a supported language, only make the file node with all the text
                else:
                    try:
                        with open(entry.path, "r", encoding="utf-8") as file:
                            text = file.read()
                    except UnicodeDecodeError:
                        print(f"Error reading file {entry.path}")
                        continue

                    file_node = {
                        "type": "FILE",
                        "attributes": {
                            "path": entry.path,
                            "file_path": entry.path,
                            "name": entry.name,
                            "node_id": BaseParser.generate_node_id(entry.path, self.global_graph_info.entity_id),
                            "text": text,
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
                if self._skip_directory(entry.name):
                    continue

                nodes, relationships, imports = self._scan_directory(
                    entry.path, nodes, relationships, imports, directory_node_id, level + 1
                )
        return nodes, relationships, imports

    def _relate_wildcard_imports(self, file_node_id: str, imports_list: list):
        import_edges = []
        for import_path in imports_list:
            all_dir_imports = self.global_graph_info.import_aliases.get(import_path)
            if all_dir_imports is None:
                all_dir_imports = [import_path]
            for dir_import in all_dir_imports:
                targetId = self.global_graph_info.imports.get(dir_import)
                if targetId:
                    import_edges.append(
                        {
                            "sourceId": file_node_id,
                            "targetId": targetId["id"],
                            "type": "IMPORTS",
                        }
                    )
        return import_edges

    # Recursive functions to relate imports
    def _relate_imports_and_directory_imports(self, file_node_id: str, path: str, visited_paths=set()):
        import_edges = []
        import_alias = self.global_graph_info.import_aliases.get(path)
        targetId = self.global_graph_info.imports.get(path)
        # If the child is not found try to link the parent
        if not targetId:
            new_path = path[: path.rfind(".")] if "." in path else path
            targetId = self.global_graph_info.imports.get(new_path)

        if not targetId and import_alias:
            if isinstance(import_alias, list):
                for alias in import_alias:
                    if alias not in visited_paths:
                        visited_paths.add(alias)
                        import_edges.extend(
                            self._relate_imports_and_directory_imports(file_node_id, alias, visited_paths)
                        )
            else:
                targetId = self.global_graph_info.imports.get(import_alias)
        if targetId:
            import_edges.append(
                {
                    "sourceId": file_node_id,
                    "targetId": targetId["id"],
                    "type": "IMPORTS",
                }
            )
        return import_edges

    def _relate_imports(self, imports: dict):
        import_edges = []
        relations_set = set()

        def add_unique_edges(edges):
            for edge in edges:
                relation = (edge["sourceId"], edge["targetId"], edge["type"])
                if relation not in relations_set:
                    import_edges.append(edge)
                    relations_set.add(relation)

        for file_node_id in imports.keys():
            for imp, import_object in imports[file_node_id].items():
                path = import_object["path"]
                if imp == "_*wildcard*_" and path:
                    related_imports = self._relate_wildcard_imports(file_node_id, path)
                    add_unique_edges(related_imports)
                    continue
                if import_object.get("type") == "package_alias":
                    import_name = import_object.get("import_name")
                    related_imports = self._relate_imports_and_directory_imports(file_node_id, f"{path}.{import_name}")
                    add_unique_edges(related_imports)
                    continue
                related_imports = self._relate_imports_and_directory_imports(file_node_id, f"{path}.{imp}")
                add_unique_edges(related_imports)

        return import_edges

    def __get_directory(self, node, function_call: str, imports: dict) -> List[str]:
        directories_to_check: List[str] = []

        if node["type"] == "FILE":
            file_imports = imports.get(node["attributes"]["node_id"], {})
        else:
            file_imports = imports.get(node["attributes"]["file_node_id"], {})

        import_object = file_imports.get(function_call.split(".")[0], {})
        alias = import_object.get("alias", "")
        function_import = import_object.get("path", "")

        if function_import:
            # Change the directory to complete path if it's an alias else it's assumed to be a regular import
            import_alias = function_import + "." + function_call.split(".")[0]
            # Sometimes the alias import returns a list
            if isinstance(self.global_graph_info.import_aliases.get(import_alias, function_import), list):
                directories_to_check.extend(self.global_graph_info.import_aliases.get(import_alias, function_import))
            else:
                directories_to_check.append(self.global_graph_info.import_aliases.get(import_alias, function_import))

        file_path: str = node["attributes"]["file_path"]
        extension: str = file_path[file_path.rfind(".") :]
        root_directory: str = file_path.replace(extension, "").replace("/", ".")
        node_directory: str = node["attributes"]["path"]
        node_directory_list = node_directory.split(".")
        node_directory_list.reverse()
        if not function_import:
            directories_to_check.append(node["attributes"]["path"])
            if root_directory != node_directory:
                scope_directory_added = False
                for scope in node_directory_list:
                    split_directory: List[str] = node_directory.split("." + scope)
                    scope_directory = ("." + scope).join(split_directory[:-1])

                    if scope_directory == root_directory:
                        directories_to_check.append(scope_directory)
                        scope_directory_added = True
                        break
                if not scope_directory_added:
                    directories_to_check.append(scope_directory)
        elif file_imports.get("_*wildcard*_"):
            # See if the import is present as wildcard import (*)
            for wildcard_path in file_imports["_*wildcard*_"]:
                import_alias = wildcard_path + "." + function_call.split(".")[0]
                if import_alias in self.global_graph_info.import_aliases:
                    directories_to_check.append(
                        self.global_graph_info.import_aliases[wildcard_path + "." + function_call.split(".")[0]]
                    )
                    break

        if isinstance(root_directory, list):
            candidates = [s for s in root_directory if s.endswith(function_call.split(".")[-1])]
            if len(candidates) == 1:
                directories_to_check.append(candidates[0])
        for directory_index, _ in enumerate(directories_to_check):
            for module in function_call.split("."):
                if module == alias:
                    if import_object.get("type") != "package_alias":
                        continue
                    module = import_object.get("import_name")

                if extension == ".py":
                    directory_modules = directories_to_check[directory_index].split(".")
                    if module not in directory_modules:
                        directories_to_check[directory_index] += f".{module}"
                else:
                    directories_to_check[directory_index] += f".{module}"

        return directories_to_check

    def _get_imported_node(self, node, import_name: str, imports: dict) -> dict:
        if node["type"] == "FILE":
            file_imports = imports.get(node["attributes"]["node_id"], None)
        else:
            file_imports = imports.get(node["attributes"]["file_node_id"], None)

        if not file_imports:
            return None

        file_import = file_imports.get(import_name, None)
        if not file_import:
            return None

        file_import_path = file_import["path"]

        if not file_import_path:
            return None

        node_path = file_import_path + "." + import_name
        imported_node = self.global_graph_info.imports.get(node_path, None)
        if imported_node:
            return imported_node["node"]

        return None

    def __get_local_node(self, node, object: str) -> dict:
        file_path: str = node["attributes"]["file_path"]
        extension: str = file_path[file_path.rfind(".") :]
        root_directory: str = file_path.replace(extension, "").replace("/", ".")
        node_directory: str = node["attributes"]["path"]
        node_directory_list = node_directory.split(".")
        node_directory_list.reverse()

        if root_directory != node_directory:
            for scope in node_directory_list:
                split_directory: List[str] = node_directory.split("." + scope)
                scope_directory = ("." + scope).join(split_directory[:-1])
                directory_to_check = scope_directory + "." + object

                search_node = self.global_graph_info.imports.get(directory_to_check, None)

                if search_node:
                    return search_node["node"]

                if scope_directory == root_directory:
                    return None
        return None

    def __get_inherits_directory(self, node, function_call: str, imports: dict, processed_calls: set) -> List[str]:
        if function_call in processed_calls:
            return []  # Prevent infinite recursion by returning early if already processed
        processed_calls.add(function_call)

        directories_to_check: List[str] = []
        owner_object = function_call.split(".")[0]
        file_path = node["attributes"]["file_path"]
        extension = file_path[file_path.rfind(".") :]

        # is defined in the same file
        inherit_file_node = self.__get_local_node(node, owner_object)

        # is imported from another file
        if not inherit_file_node:
            inherit_file_node = self._get_imported_node(node, owner_object, imports)

        # If is not defined or imported, means that is a third-party library
        if not inherit_file_node:
            return []

        class_function_inherits = self.global_graph_info.inheritances.get(
            inherit_file_node["attributes"]["node_id"], []
        )
        for class_function_inherit in class_function_inherits:
            inherits_directories_to_check = self.__get_directory(inherit_file_node, class_function_inherit, imports)
            for directory_index, _ in enumerate(inherits_directories_to_check):
                for module in function_call.split(".")[1:]:
                    if extension == ".py":
                        directory_modules = inherits_directories_to_check[directory_index].split(".")
                        if module not in directory_modules:
                            inherits_directories_to_check[directory_index] += f".{module}"
                    else:
                        inherits_directories_to_check[directory_index] += f".{module}"
            directories_to_check.extend(inherits_directories_to_check)
            new_function_call = class_function_inherit + "." + ".".join(function_call.split(".")[1:])
            directories_to_check.extend(
                self.__get_inherits_directory(node, new_function_call, imports, processed_calls)
            )
        return directories_to_check

    def __relate_function_calls(self, node, imports):
        relations = []
        function_calls = node["attributes"].get("function_calls")

        for function_call in function_calls:
            # Get the directory of the function using the import logic of the language
            directories_to_check = self.__get_directory(node, function_call, imports)
            inherits_directories_to_check = self.__get_inherits_directory(node, function_call, imports, set())
            directories_to_check.extend(inherits_directories_to_check)
            # Look for the node with the definition of the function
            target_object = None
            for directory in directories_to_check:
                if self.global_graph_info.imports.get(directory):
                    target_object = self.global_graph_info.imports.get(directory)
                    break

            if target_object:
                target_object_type = target_object["type"]
                if target_object_type == "FUNCTION" or target_object_type == "FILE":
                    relations.append(
                        {
                            "sourceId": node["attributes"]["node_id"],
                            "targetId": target_object["id"],
                            "type": "CALLS",
                        }
                    )
                elif target_object_type == "CLASS":
                    relations.append(
                        {
                            "sourceId": node["attributes"]["node_id"],
                            "targetId": target_object["id"],
                            "type": "INSTANTIATES",
                        }
                    )

                    init_directory = directory + ".__init__"
                    if os.path.exists(init_directory + ".py"):
                        relations.append(
                            {
                                "sourceId": node["attributes"]["node_id"],
                                "targetId": target_object["id"],
                                "type": "CALLS",
                            }
                        )
        return relations

    def __relate_inheritances(self, node, imports):
        relations = []
        inherits = node["attributes"].get("inheritances")

        for inherit in inherits:
            # Get the directory of the function using the import logic of the language
            directories_to_check = self.__get_directory(node, inherit, imports)
            # Look for the node with the definition of the class
            target_class = None
            for directory in directories_to_check:
                if self.global_graph_info.imports.get(directory):
                    target_class = self.global_graph_info.imports.get(directory)
                    break

            if target_class:
                relations.append(
                    {
                        "sourceId": node["attributes"]["node_id"],
                        "targetId": target_class["id"],
                        "type": "INHERITS",
                    }
                )

        return relations

    def _relate_constructor_calls(self, node_list, imports):
        constructors_calls_relations = []
        for node in node_list:
            if node["attributes"].get("function_calls"):
                function_calls_relations = self.__relate_function_calls(node, imports)
                constructors_calls_relations.extend(function_calls_relations)
            if node["attributes"].get("inheritances"):
                instantiations_relations = self.__relate_inheritances(node, imports)
                constructors_calls_relations.extend(instantiations_relations)

        return constructors_calls_relations

    def build_graph(self):
        # process every node to create the graph structure
        print("Building graph...")
        start_time = time.time()

        nodes, relationships, imports = self._scan_directory(self.root)

        # relate imports between file nodes
        relationships.extend(self._relate_imports(imports))
        # relate functions calls
        relationships.extend(self._relate_constructor_calls(nodes, imports))
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"Execution time: {execution_time} seconds")

        return nodes, relationships
