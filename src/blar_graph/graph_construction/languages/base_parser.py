import hashlib
import os
import re
from abc import ABC, abstractmethod
from functools import reduce
from pathlib import Path
from typing import List

import tree_sitter_languages
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import BaseNode, Document, TextNode
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser
from llama_index.packs.code_hierarchy.code_hierarchy import _SignatureCaptureOptions
from tree_sitter import Language, Node, Parser

from blar_graph.graph_construction.utils import format_nodes
from blar_graph.graph_construction.utils.interfaces.GlobalGraphInfo import (
    GlobalGraphInfo,
)


class BaseParser(ABC):
    language: str
    wildcard: str
    extension: str
    import_path_separator: str
    global_graph_info: GlobalGraphInfo
    arguments_in_function_call: bool = False

    def __init__(
        self,
        language: str,
        wildcard: str,
        extension: str,
        import_path_separator: str = ".",
        global_graph_info: GlobalGraphInfo = {"alias": {}},
    ):
        self.language = language
        self.wildcard = wildcard
        self.extension = extension
        self.import_path_separator = import_path_separator
        self.global_graph_info = global_graph_info

    @staticmethod
    def generate_node_id(path: str, company_id: str):
        # Concatenate path and signature
        combined_string = f"{company_id}:{path}"

        # Create a SHA-1 hash of the combined string
        hash_object = hashlib.md5()
        hash_object.update(combined_string.encode("utf-8"))

        # Get the hexadecimal representation of the hash
        node_id = hash_object.hexdigest()

        return node_id

    @staticmethod
    def is_package(path: str) -> bool:
        return os.path.exists(os.path.join(path, "__init__.py"))

    def _post_process_node(self, node: dict, global_graph_info: GlobalGraphInfo):
        text = node["attributes"]["text"]

        # Extract the node_id using re.search
        matches = re.findall(r"Code replaced for brevity\. See node_id ([0-9a-fA-F-]+)", text)
        for match in matches:
            extracted_node_id = match
            # Get the mapped_generated_id using the extracted node_id
            mapped_generated_id = global_graph_info.visited_nodes.get(extracted_node_id, {}).get("generated_id")
            if mapped_generated_id is not None:
                # Replace the extracted node_id with the mapped_generated_id
                updated_text = re.sub(
                    rf"Code replaced for brevity\. See node_id {extracted_node_id}",
                    f"Code replaced for brevity. See node_id {mapped_generated_id}",
                    text,
                )
                text = updated_text

        node["attributes"]["text"] = text

        return node

    def _get_lines_range(self, file_contents, start_byte, end_byte):
        start_line = file_contents.count("\n", 0, start_byte) + 1
        end_line = file_contents.count("\n", 0, end_byte) + 1

        return (start_line, end_line)

    def get_node_path(self, node: BaseNode):
        file_path = node.metadata["filepath"]
        scopes = node.metadata["inclusive_scopes"]
        scopes_path = reduce(lambda x, y: x + "." + y["name"], scopes, "")

        no_extension_path = self.remove_extensions(file_path)
        node_path = no_extension_path.replace("/", ".")

        if len(scopes_path) > 0:
            return node_path + scopes_path
        return node_path

    def _get_parent_level(self, node: BaseNode, global_graph_info: GlobalGraphInfo, level: int):
        parent_level = level

        try:
            parent = node.parent_node
        except Exception:
            parent = None

        if parent:
            parent_level = global_graph_info.visited_nodes.get(parent.node_id, {}).get("level", level)

        return parent_level

    def _get_function_calls(self, node: Node, assignments_dict: dict) -> list[str]:
        code_text = node.text
        function_calls = []

        parser = tree_sitter_languages.get_parser(self.language)
        tree = parser.parse(bytes(code_text, "utf-8"))
        language = tree_sitter_languages.get_language(self.language)

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
        class_name = None
        for scope in node.metadata["inclusive_scopes"]:
            if scope["type"] in self.scopes_names["function"]:
                method_name = scope["name"]
            if scope["type"] in self.scopes_names["class"]:
                class_name = scope["name"]

        for call_node, _ in function_calls_nodes:
            if method_name and call_node.text.decode() == method_name:
                continue

            decomposed_call = self._decompose_function_call(call_node, language, parser)
            if not decomposed_call:
                continue

            called_from_assignment = False
            join_call = decomposed_call[0]
            for index, call in enumerate(decomposed_call):
                if index != 0:
                    join_call += "." + call

                if self.self_syntax in join_call:
                    if class_name:
                        join_call = class_name + "." + join_call.split(self.self_syntax)[1]

                if assignments_dict.get(join_call):
                    function_calls.append(assignments_dict[join_call] + "." + ".".join(decomposed_call[index + 1 :]))
                    called_from_assignment = True
                    break

            if not called_from_assignment:
                node_text = (
                    call_node.text.decode() if not self.arguments_in_function_call else ".".join(decomposed_call)
                )
                if self.self_syntax in node_text:
                    if class_name:
                        node_text = class_name + "." + node_text.split(self.self_syntax)[1]
                function_calls.append(node_text)

        return function_calls

    def _get_inheritances(self, node: Node) -> list[str]:
        code_text = node.text
        inheritances: List[str] = []

        parser = tree_sitter_languages.get_parser(self.language)
        tree = parser.parse(bytes(code_text, "utf-8"))
        language = tree_sitter_languages.get_language(self.language)

        inheritances_query = language.query(self.inheritances_query)

        inheritances_captures = inheritances_query.captures(tree.root_node)

        for inheritance, inheritance_type in inheritances_captures:
            if inheritance_type == "inheritance":
                inheritances.append(inheritance.text.decode())

        return inheritances

    def __process_node__(
        self,
        node: TextNode,
        file_path: str,
        file_node_id: str,
        global_graph_info: GlobalGraphInfo,
        assignment_dict: dict,
        document: Document,
        level: int,
    ):
        relationships = []
        inclusive_scopes = node.metadata["inclusive_scopes"]
        scope = inclusive_scopes[-1] if inclusive_scopes else None
        type_node = scope["type"] if scope else "file"
        parent_level = level
        leaf = False

        function_calls = self._get_function_calls(node, assignment_dict)
        if type_node in self.scopes_names["function"]:
            core_node = format_nodes.format_function_node(node, scope, function_calls, file_node_id)
        elif type_node in self.scopes_names["class"]:
            inheritances = self._get_inheritances(node)
            core_node = format_nodes.format_class_node(node, scope, file_node_id, inheritances, function_calls)
        else:
            core_node = format_nodes.format_file_node(node, file_path, function_calls)

        parent_level = self._get_parent_level(node, global_graph_info, level)

        node_path = self.get_node_path(node)
        parent_path = ".".join(node_path.split(".")[:-1])

        parent_id = BaseParser.generate_node_id(parent_path, global_graph_info.entity_id)
        node_id = BaseParser.generate_node_id(node_path, global_graph_info.entity_id)
        if type_node in self.scopes_names["class"]:
            global_graph_info.inheritances[node_id] = inheritances

        relation_type = scope["type"] if scope else ""
        if self.relation_types_map.get(relation_type) is not None:
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
            "node_id": node_id,
        }

        processed_node = {
            **core_node,
            "attributes": {
                **core_node["attributes"],
                **horizontal_attributes,
            },
        }

        global_graph_info.imports[node_path] = {
            "id": processed_node["attributes"]["node_id"],
            "type": processed_node["type"],
            "node": processed_node,
        }

        global_graph_info.visited_nodes[node.node_id] = {"level": parent_level + 1, "generated_id": node_id}
        return processed_node, relationships

    def remove_extensions(self, file_path):
        no_extension_path = str(file_path)
        no_extension_path = no_extension_path.replace(self.extension, "")
        return no_extension_path

    def _decompose_function_call(self, call_node: Node, language: Language, parser: Parser):
        calls_query = language.query(self.decompose_call_query)

        # Need to get the tree to get the query going
        call_tree = parser.parse(call_node.text)
        decompose_call = calls_query.captures(call_tree.root_node)

        list_decomposed_calls: List[str] = []
        for decompose_node, _ in decompose_call:
            list_decomposed_calls.append(decompose_node.text.decode())

        return list_decomposed_calls

    def resolve_relative_import_path(self, import_statement, current_file_path, project_root):
        if import_statement.startswith(".."):
            import_statement = import_statement[2:]
            if import_statement.startswith("/"):
                import_statement = import_statement[1:]
            current_file_path = os.sep.join(current_file_path.split(os.sep)[:-1])
        elif import_statement.startswith("."):
            import_statement = import_statement[1:]
            if import_statement.startswith("/"):
                import_statement = import_statement[1:]
        else:
            return self.find_module_path(import_statement, current_file_path, project_root)

        return self.resolve_relative_import_path(import_statement, current_file_path, project_root)

    def replace_alias_in_import(self, import_statement, project_root):
        # Extract the alias (part before the first path separator)
        alias = import_statement.split(self.import_path_separator)[0]

        # Check if the alias is in the dictionary
        if alias in self.global_graph_info.aliases:
            actual_path = self.global_graph_info.aliases[alias]
            # Replace the alias with the actual path
            new_path = import_statement.replace(alias, actual_path, 1)
            new_import_statement = import_statement.replace(import_statement, new_path)
            # ./ imports are treated differently so we need to make it an absolute import
            new_import_statement = new_import_statement.replace("./", "/")
            return new_import_statement

        return import_statement

    def resolve_import_path(self, import_statement, current_file_directory, project_root):
        # Handling relative imports
        if import_statement.startswith("@"):
            import_statement = self.replace_alias_in_import(import_statement, project_root)
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
            if self.check_path_exists(possible_path) or BaseParser.is_package(possible_path):
                return possible_path.replace("/", ".")
            # Move one directory up
            current_dir = os.path.dirname(current_dir)
        return None

    def check_path_exists(self, path):
        if self.language in ["typescript", "tsx", "javascript", "jsx"]:
            return any(os.path.exists(path + extension) for extension in ["", ".ts", ".tsx", ".js", ".jsx"])
        return os.path.exists(path + self.extension)

    def _remove_non_ascii(self, text):
        # Define the regular expression pattern to match ascii characters
        pattern = re.compile(r"[^\x00-\x7F]+")
        # Replace ascii characters with an empty string
        cleaned_text = pattern.sub("", text)
        return cleaned_text

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
        documents[0].text = self._remove_non_ascii(documents[0].text)

        code = CodeHierarchyNodeParser(
            language=self.language,
            chunk_min_characters=3,
            signature_identifiers=self.signature_identifiers,
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

        post_processed_node_list = []
        for node in node_list:
            node = self._post_process_node(node, global_graph_info)
            post_processed_node_list.append(node)

        imports = self._get_imports(str(path), node_list[0]["attributes"]["node_id"], root_path)

        return post_processed_node_list, edges_list, imports

    @abstractmethod
    def parse_file(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        pass

    @abstractmethod
    def _get_imports(self, path: str, file_node_id: str, root_path: str) -> dict:
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
    def inheritances_query(self) -> str:
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

    @property
    def signature_identifiers(self) -> dict[str, _SignatureCaptureOptions]:
        return None
