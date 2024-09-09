import os

import tree_sitter_languages

from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.utils.interfaces.GlobalGraphInfo import (
    GlobalGraphInfo,
)


class RubyParser(BaseParser):
    def __init__(self, global_graph_info: GlobalGraphInfo):
        super().__init__("ruby", None, ".rb", "/", global_graph_info)

    @property
    def self_syntax(self):
        return "self."

    @property
    def decompose_call_query(self):
        return """
            (call
                receiver: (identifier) @_
            )
            (call
                method: (identifier) @_
            )
        """

    @property
    def assignment_query(self):
        return """
            (assignment
                left: (identifier) @variable
                right: _ @expression
            )
        """

    @property
    def function_call_query(self):
        return """
            (
                (call
                method: (identifier) @function_call)
                (#not-eq? @function_call "require_relative")
            )
            (program (identifier) @function_call)
        """

    @property
    def inheritances_query(self):
        return """
            (class
                name: (constant)
                superclass: (superclass
                    (constant) @inheritance)
                )
                (class
                    body: (body_statement
                    (call
                        method: (identifier) @call_inside_class
                        arguments: (argument_list
                            (constant) @inheritance)
                    )
                    (#eq? @call_inside_class "include")
                )
            )
        """

    @property
    def scopes_names(self):
        return {
            "function": ["method"],
            "class": ["class"],
            "plain_code_block": [],
        }

    @property
    def relation_types_map(self):
        return {
            "method": "FUNCTION_DEFINITION",
            "class": "CLASS_DEFINITION",
        }

    def parse_file(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        return self.parse(file_path, root_path, global_graph_info, level)

    def _get_imports(self, path: str, file_node_id: str, root_path: str) -> dict:
        parser = tree_sitter_languages.get_parser(self.language)
        language = tree_sitter_languages.get_language(self.language)
        imports_query = language.query(
            """
            (call
                method: (identifier) @function_name
                arguments: (argument_list
                    (string (string_content) @source_path)
                    )
                (#eq? @function_name "require")
            )
            (call
                method: (identifier) @function_name
                arguments: (argument_list
                    (string (string_content) @source_path)
                    )
                (#eq? @function_name "require_relative")
            )
            """
        )

        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = {"_*wildcard*_": {"path": [], "alias": "", "type": "wildcard"}}
        captured_imports = imports_query.captures(tree.root_node)

        for import_node, import_type in captured_imports:
            if import_type == "function_name":
                import_function = import_node.text.decode()
            if import_type == "source_path":
                from_text = import_node.text.decode()
                import_statement = f"{import_function}###{from_text}"
                imports["_*wildcard*_"]["path"].append(
                    self.resolve_import_path(import_statement, path, root_path),
                )

        return {file_node_id: imports}

    def resolve_import_path(self, import_statement, current_file_directory, project_root):
        import_statement = import_statement.split("###")
        import_function = import_statement[0]
        import_path = import_statement[1]
        # handling relative imports
        if import_function == "require_relative":
            current_file_directory = os.sep.join(current_file_directory.split(os.sep)[:-1])
            import_path = "./" + import_path
            return self.resolve_relative_import_path(import_path, current_file_directory, project_root)
        else:
            # Handling absolute imports
            return self.find_module_path(import_path, current_file_directory, project_root)
