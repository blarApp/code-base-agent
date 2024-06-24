import os
import traceback
import uuid
from typing import List

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.languages.python.python_parser import PythonParser
from blar_graph.graph_construction.languages.typescript.typescript_parser import (
    TypescriptParser,
)
from blar_graph.graph_construction.utils import format_nodes
from blar_graph.graph_construction.utils.interfaces import GlobalGraphInfo


class GraphConstructor:
    graph_manager: Neo4jManager
    global_graph_info: GlobalGraphInfo
    root: str
    skip_tests: bool
    parser: BaseParser
    language: str

    def __init__(self, graph_manager: Neo4jManager, language="python"):
        self.graph_manager = graph_manager
        self.global_graph_info = GlobalGraphInfo(entity_id=graph_manager.entityId)
        self.root = None
        self.skip_tests = True
        self.language = language
        if language == "python":
            self.parser = PythonParser()
        elif language == "typescript":
            self.parser = TypescriptParser()
        else:
            raise ValueError(f"Language {language} not supported")
        # TODO: Add more languages

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
        if self.root is None:
            self.root = path
        if path.endswith("tests") or path.endswith("test"):
            return nodes, relationships, imports

        package = self.parser.is_package(path)

        core_directory_node = format_nodes.format_directory_node(path, package, level)
        directory_node_id = self.parser.generate_node_id(path, self.global_graph_info.entity_id)

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
            if (entry.name in ["legacy", "test"] and self.skip_tests) or entry.name.startswith("."):
                continue
            if entry.is_file():
                if entry.name.endswith(self.parser.extension):
                    entry_name = entry.name.split(self.parser.extension)[0]
                    try:
                        processed_nodes, relations, file_imports = self.parser.parse_file(
                            entry.path,
                            self.root,
                            global_graph_info=self.global_graph_info,
                            level=level,
                        )
                    except Exception:
                        print(f"Error {entry.path}")
                        print(traceback.format_exc())
                        continue
                    print(f"Processed {entry.path}")
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
                if self.parser.skip_directory(entry.name):
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
        for file_node_id in imports.keys():
            for imp, import_object in imports[file_node_id].items():
                path = import_object["path"]
                if imp == "_*wildcard*_" and path:
                    related_imports = self._relate_wildcard_imports(file_node_id, path)
                    import_edges.extend(related_imports)
                    continue
                import_edges.extend(self._relate_imports_and_directory_imports(file_node_id, f"{path}.{imp}"))

        return import_edges

    def __get_directory(self, node, function_call: str, imports: dict) -> List[str]:
        root_directory = node["attributes"]["file_path"].replace(self.parser.extension, "").replace("/", ".")
        node_directory = node["attributes"]["path"]
        node_directory_list = node_directory.split(".")
        node_directory_list.reverse()
        directories_to_check = [node["attributes"]["path"]]
        if root_directory != node_directory:
            for scope in node_directory_list:
                split_directory: List[str] = node_directory.split("." + scope)
                scope_directory = ("." + scope).join(split_directory[:-1])

                if scope_directory == root_directory:
                    directories_to_check.append(scope_directory)
                    break
                directories_to_check.append(scope_directory)

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
            directories_to_check.append(self.global_graph_info.import_aliases.get(import_alias, function_import))
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
                    continue
                if self.language == "python":
                    directory_modules = directories_to_check[directory_index].split(".")
                    if module not in directory_modules:
                        directories_to_check[directory_index] += f".{module}"
                else:
                    directories_to_check[directory_index] += f".{module}"

        return directories_to_check

    def __relate_function_calls(self, node, imports):
        relations = []
        function_calls = node["attributes"].get("function_calls")

        owner_class = node["attributes"].get("owner_class")
        class_function_inherits = []
        if owner_class:
            class_function_inherits = self.global_graph_info.inheritances.get(owner_class, [])

        for function_call in function_calls:
            # Get the directory of the function using the import logic of the language
            directories_to_check = self.__get_directory(node, function_call, imports)
            for class_function_inherit in class_function_inherits:
                inherits_directories_to_check = self.__get_directory(node, class_function_inherit, imports)
                for directory_index, _ in enumerate(inherits_directories_to_check):
                    module = function_call.split(".")[-1]
                    if self.language == "python":
                        directory_modules = inherits_directories_to_check[directory_index].split(".")
                        if module not in directory_modules:
                            inherits_directories_to_check[directory_index] += f".{module}"
                    else:
                        inherits_directories_to_check[directory_index] += f".{module}"
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

    def build_graph(self, path):
        # process every node to create the graph structure
        nodes, relationships, imports = self._scan_directory(path)
        # relate imports between file nodes
        relationships.extend(self._relate_imports(imports))
        # relate functions calls
        relationships.extend(self._relate_constructor_calls(nodes, imports))

        self.graph_manager.save_graph(nodes, relationships)
