import hashlib
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

import tree_sitter_languages
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import BaseNode, Document
from llama_index.core.text_splitter import CodeSplitter
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from tree_sitter import Language, Node

from blar_graph.graph_construction.utils import format_nodes, tree_parser
from blar_graph.graph_construction.utils.interfaces import GlobalGraphInfo


class BaseParser(ABC):
    language: str
    wildcard: str
    extension: str
    import_path_separator: str

    def __init__(
        self,
        language: str,
        wildcard: str,
        extension: str,
        import_path_separator: str = ".",
    ):
        self.language = language
        self.wildcard = wildcard
        self.extension = extension
        self.import_path_separator = import_path_separator

    def parse(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        path = Path(file_path)
        if not path.exists():
            print(f"File {file_path} does not exist.")
            raise FileNotFoundError

        documents = SimpleDirectoryReader(
            input_files=[path],
            file_metadata=lambda x: {"filepath": x},
        ).load_data()

        # Bug related to llama-index it's safer to remove non-ascii characters. Could be removed in the future
        documents[0].text = tree_parser.remove_non_ascii(documents[0].text)
        # Format methods for typescript, because the parser doesn't recognize the methods by itself
        if self.language == "typescript":
            documents[0].text = tree_parser.format_methods(documents[0].text, self.language)

        code = CodeHierarchyNodeParser(
            language=self.language,
            chunk_min_characters=3,
            code_splitter=CodeSplitter(language=self.language, max_chars=10000, chunk_lines=10),
        )
        try:
            split_nodes = code.get_nodes_from_documents(documents)
        except TimeoutError:
            print(f"Timeout error: {file_path}")
            return [], [], {}

        node_list = []
        edges_list = []
        assignment_dict = {}

        file_node, file_relations = self.__process_node__(
            split_nodes.pop(0), file_path, "", global_graph_info, assignment_dict, documents[0], level
        )
        node_list.append(file_node)
        edges_list.extend(file_relations)

        for node in split_nodes:
            processed_node, relationships = self.__process_node__(
                node,
                file_path,
                file_node["attributes"]["node_id"],
                global_graph_info,
                assignment_dict,
                documents[0],
                level,
            )

            node_list.append(processed_node)
            edges_list.extend(relationships)

        imports = self._get_imports(str(path), node_list[0]["attributes"]["node_id"], root_path)

        return node_list, edges_list, imports

    def _get_lines_range(self, file_contents, start_byte, end_byte):
        start_line = file_contents.count("\n", 0, start_byte) + 1
        end_line = file_contents.count("\n", 0, end_byte) + 1

        return (start_line, end_line)

    def generate_node_id(self, path: str, company_id: str):
        # Concatenate path and signature
        combined_string = f"{company_id}:{path}"

        # Create a SHA-1 hash of the combined string
        hash_object = hashlib.md5()
        hash_object.update(combined_string.encode("utf-8"))

        # Get the hexadecimal representation of the hash
        node_id = hash_object.hexdigest()

        return node_id

    def _get_parent_info(self, node: BaseNode, global_graph_info: GlobalGraphInfo, no_extension_path: str, level: int):
        parent_level = level
        parent_path = None

        try:
            parent = node.parent_node
        except Exception:
            parent = None

        if parent:
            parent_path = (
                global_graph_info.visited_nodes.get(parent.node_id, {}).get("path", no_extension_path).replace("/", ".")
            )
            parent_level = global_graph_info.visited_nodes.get(parent.node_id, {}).get("level", level)

        return parent_path, parent_level

    def __process_node__(
        self,
        node: BaseNode,
        file_path: str,
        file_node_id: str,
        global_graph_info: GlobalGraphInfo,
        assignment_dict: dict,
        document: Document,
        level: int,
    ):
        no_extension_path = self._remove_extensions(file_path)
        relationships = []
        scope = node.metadata["inclusive_scopes"][-1] if node.metadata["inclusive_scopes"] else None
        type_node = scope["type"] if scope else "file"
        parent_level = level
        leaf = False

        if type_node in self.scopes_names["function"]:
            function_calls = self.get_function_calls(node, assignment_dict, self.language)
            core_node = format_nodes.format_function_node(node, scope, function_calls, file_node_id)
        elif type_node in self.scopes_names["class"]:
            inheritances = tree_parser.get_inheritances(node, self.language)
            core_node = format_nodes.format_class_node(node, scope, file_node_id, inheritances)
            global_graph_info.inheritances[core_node["attributes"]["name"]] = inheritances
        elif type_node in self.scopes_names["plain_code_block"]:
            function_calls = self.get_function_calls(node, assignment_dict, self.language)
            core_node = format_nodes.format_plain_code_block_node(node, scope, function_calls, file_node_id)
        else:
            function_calls = self.get_function_calls(node, assignment_dict, self.language)
            core_node = format_nodes.format_file_node(node, file_path, function_calls)

        parent_path, parent_level = self._get_parent_info(node, global_graph_info, no_extension_path, level)

        node_path = no_extension_path.replace("/", ".")
        node_id = self.generate_node_id(node_path, global_graph_info.entity_id)
        if parent_path:
            node_path = f"{parent_path}.{core_node['attributes']['name']}"
            node_id = self.generate_node_id(node_path, global_graph_info.entity_id)

            parent_id = self.generate_node_id(parent_path, global_graph_info.entity_id)
            relation_type = scope["type"] if scope else ""
            relationships.append(
                {
                    "sourceId": parent_id,
                    "targetId": node_id,
                    "type": self.relation_types_map.get(relation_type, "UNKNOWN"),
                }
            )

        start_line, end_line = self._get_lines_range(
            document.text, node.metadata["start_byte"], node.metadata["end_byte"]
        )

        horizontal_attributes = {
            "start_line": start_line,
            "end_line": end_line,
            "path": node_path,
            "file_path": file_path,
            "level": parent_level + 1,
            "leaf": leaf,
        }

        processed_node = {
            **core_node,
            "attributes": {
                **core_node["attributes"],
                **horizontal_attributes,
                "node_id": node_id,
            },
        }

        global_graph_info.imports[node_path] = {
            "id": processed_node["attributes"]["node_id"],
            "type": processed_node["type"],
        }

        global_graph_info.visited_nodes[node.node_id] = {"path": node_path, "level": parent_level + 1}
        return processed_node, relationships

    def _remove_extensions(self, file_path):
        no_extension_path = str(file_path)
        no_extension_path = no_extension_path.replace(self.extension, "")
        return no_extension_path

    def _decompose_function_call(self, call_node: Node, language: Language, decomposed_calls=[]):
        calls_query = language.query(self.decompose_call_query)

        decompose_call = calls_query.captures(call_node)

        if len(decompose_call) == 0:
            decomposed_calls.append(call_node.text.decode())
            return decomposed_calls

        nested_object = False
        for decompose_node, type in decompose_call:
            if type == "nested_object":
                nested_object = True
                decomposed_calls = self._decompose_function_call(decompose_node, language, decomposed_calls)
            elif (type == "object" or type == "method") and nested_object:
                continue
            else:
                decomposed_calls.append(decompose_node.text.decode())

        return decomposed_calls

    def resolve_relative_import_path(self, import_statement, current_file_path, project_root):
        if import_statement.startswith(".."):
            import_statement = import_statement[2:]
            current_file_path = os.sep.join(current_file_path.split(os.sep)[:-1])
        elif import_statement.startswith("."):
            import_statement = import_statement[1:]
        else:
            return self.find_module_path(import_statement, current_file_path, project_root)

        return self.resolve_relative_import_path(import_statement, current_file_path, project_root)

    def resolve_import_path(self, import_statement, current_file_directory, project_root):
        # Handling relative imports
        if import_statement.startswith("."):
            current_file_directory = os.sep.join(current_file_directory.split(os.sep)[:-1])
            return self.resolve_relative_import_path(import_statement, current_file_directory, project_root)
        else:
            # Handling absolute imports
            return self.find_module_path(import_statement, current_file_directory, project_root)

    def find_module_path(self, module_name, start_dir, project_root):
        current_dir = start_dir
        components = module_name.split(self.import_path_separator)

        # Make sure to find in the same directory as the root
        project_root = os.sep.join(project_root.split(os.sep)[:-1])
        # Try to find the module by traversing up towards the root until the module path is found or root is reached
        while current_dir.startswith(project_root) and (current_dir != "" or project_root != ""):
            possible_path = os.path.join(current_dir, *components)
            # Check for a direct module or package
            if os.path.exists(possible_path + self.extension) or self.is_package(possible_path):
                return possible_path.replace("/", ".")
            # Move one directory up
            current_dir = os.path.dirname(current_dir)
        return None

    def get_function_calls(self, node: Node, assignments_dict: dict, language: str) -> list[str]:
        code_text = node.text
        function_calls = []

        parser = tree_sitter_languages.get_parser(language)
        tree = parser.parse(bytes(code_text, "utf-8"))
        language = tree_sitter_languages.get_language(language)

        assignment_query = language.query(self.assignment_query)

        assignments = assignment_query.captures(tree.root_node)

        for assignment_node, assignment_type in assignments:
            if assignment_type == "variable":
                variable_identifier_node = assignment_node
                variable_identifier = variable_identifier_node.text.decode()
                if self.self_syntax in variable_identifier:
                    for scope in node.metadata["inclusive_scopes"]:
                        if scope["type"] == "class_definition":
                            variable_identifier = scope["name"] + "." + variable_identifier.split(self.self_syntax)[1]
                            break
                continue

            if assignment_type == "expression":
                assign_value = assignment_node

                if assign_value.type == "call" or assign_value.type == "new_expression":
                    expression = assign_value
                    expression_identifier = expression.named_children[0].text.decode()
                    assignments_dict[variable_identifier] = expression_identifier
                    continue

                assignments_dict[variable_identifier] = assign_value.text.decode()

        calls_query = language.query(self.function_call_query)

        function_calls_nodes = calls_query.captures(tree.root_node)

        method_name = None
        for scope in node.metadata["inclusive_scopes"]:
            if scope["type"] == "method_definition":
                method_name = scope["name"]
                break

        for call_node, _ in function_calls_nodes:
            if method_name and call_node.text.decode() == method_name:
                continue
            decomposed_call = self._decompose_function_call(call_node, language, [])
            called_from_assignment = False

            join_call = decomposed_call[0]
            for index, call in enumerate(decomposed_call):
                if index != 0:
                    join_call += "." + call

                if self.self_syntax in join_call:
                    for scope in node.metadata["inclusive_scopes"]:
                        if scope["type"] == "class_definition":
                            join_call = scope["name"] + "." + join_call.split(self.self_syntax)[1]
                            break

                if assignments_dict.get(join_call):
                    function_calls.append(assignments_dict[join_call] + "." + ".".join(decomposed_call[index + 1 :]))
                    called_from_assignment = True
                    break

            if not called_from_assignment:
                node_text = call_node.text.decode()
                if self.self_syntax in node_text:
                    for scope in node.metadata["inclusive_scopes"]:
                        if scope["type"] == "class_definition":
                            node_text = scope["name"] + "." + node_text.split(self.self_syntax)[1]
                            break
                function_calls.append(node_text)

        return function_calls

    def is_package(self, directory):
        return False

    @abstractmethod
    def parse_file(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        pass

    @abstractmethod
    def _get_imports(self, path: str, file_node_id: str, root_path: str) -> dict:
        pass

    @abstractmethod
    def skip_directory(self, directory: str) -> bool:
        pass

    @property
    @abstractmethod
    def decompose_call_query(self) -> str:
        pass

    @property
    @abstractmethod
    def assignment_query(self) -> str:
        pass

    @property
    @abstractmethod
    def function_call_query(self) -> str:
        pass

    @property
    @abstractmethod
    def self_syntax(self) -> str:
        pass

    @property
    @abstractmethod
    def scopes_names(self) -> dict[str, List[str]]:
        pass

    @property
    @abstractmethod
    def relation_types_map(self) -> dict[str, str]:
        pass
