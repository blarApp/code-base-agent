import tree_sitter_languages

from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.utils.interfaces import GlobalGraphInfo


class TypescriptParser(BaseParser):
    def __init__(self):
        super().__init__("typescript", None, ".ts", "/")

    @property
    def self_syntax(self):
        return "this."

    @property
    def decompose_call_query(self):
        return """
            (member_expression
                object: [
                    (identifier) @object
                    ((property_identifier) @nested_object
                    property: _ @nested_method)
                ]
                property: _ @method)
            """

    @property
    def assignment_query(self):
        return """(variable_declarator name: _ @variable value: _ @expression )"""

    @property
    def function_call_query(self):
        return """(call_expression function: _ @function_call)"""

    @property
    def scopes_names(self):
        return {
            "function": ["function_declaration", "method_definition"],
            "class": ["class_declaration"],
            "plain_code_block": ["lexical_declaration"],
        }

    @property
    def relation_types_map(self):
        return {
            "function_declaration": "FUNCTION_DEFINITION",
            "method_definition": "FUNCTION_DEFINITION",
            "class_declaration": "CLASS_DEFINITION",
            "lexical_declaration": "CODE_BLOCK",
        }

    def skip_directory(self, directory: str) -> bool:
        return directory == "node_modules"

    def parse_file(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        return self.parse(file_path, root_path, global_graph_info, level)

    def _get_imports(self, path: str, file_node_id: str, root_path: str) -> dict:
        parser = tree_sitter_languages.get_parser(self.language)
        language = tree_sitter_languages.get_language(self.language)
        imports_query = language.query(
            """
          (import_statement
            (import_clause
                [
                  (identifier) @single_imported_name
                  (named_imports
                    (import_specifier
                      name: (identifier) @imported_name
                    )
                  )*
                  (namespace_import (identifier) @alias)
                ]
              )
            source: (string
              (string_fragment) @source_path
            )
          )"""
        )

        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = {"_*wildcard*_": {"path": [], "alias": "", "type": "wildcard"}}
        captured_imports = imports_query.captures(tree.root_node)

        imports_name = []
        alias = None
        for import_node, import_type in captured_imports:
            # Import specific objects case
            if import_type == "imported_name" or import_type == "single_imported_name":
                imports_name.append(import_node.text.decode())

            elif import_type == "alias":
                alias = import_node.text.decode()
            elif import_type == "source_path":
                from_text = import_node.text.decode()
                for import_name in imports_name:
                    imports[import_name] = {
                        "path": self.resolve_import_path(from_text, path, root_path),
                        "alias": "",
                        "type": "named_import",
                    }
                if alias:
                    imports[alias] = {
                        "path": self.resolve_import_path(from_text, path, root_path),
                        "alias": alias,
                        "type": "alias",
                    }
                imports_name = []
                alias = None

        return {file_node_id: imports}
