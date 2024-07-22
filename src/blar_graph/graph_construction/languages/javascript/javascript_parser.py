import tree_sitter_languages

from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.utils.interfaces.GlobalGraphInfo import (
    GlobalGraphInfo,
)


class JavascriptParser(BaseParser):
    def __init__(self):
        super().__init__("javascript", None, ".js", "/")

    @property
    def self_syntax(self):
        return "this."

    @property
    def decompose_call_query(self):
        return """
            (member_expression
                object: [
                    (identifier) @_
                    (this) @_
                ]
            )
            (member_expression
                property: (property_identifier) @_
            )
            (expression_statement
                (identifier) @_
            )
            """

    @property
    def assignment_query(self):
        return """(variable_declarator name: _ @variable value: _ @expression )"""

    @property
    def function_call_query(self):
        return """(call_expression function: _ @function_call)"""

    @property
    def inheritances_query(self):
        # ugly ass query because tree_sitter doesn't have a recursive or dynamic approach.
        # So, to retrieve several nested inheritances I did it explicitly.
        # It supports 5 levels
        return """
            (class_heritage
                [
                    (identifier) @inheritance
                    (call_expression
                        function: (identifier) @inheritance
                        arguments: (arguments
                        [
                            (identifier) @inheritance
                            (call_expression
                            function: (identifier) @inheritance
                            arguments: (arguments
                                [
                                (identifier) @inheritance
                                (call_expression
                                    function: (identifier) @inheritance
                                    arguments: (arguments
                                    [
                                        (identifier) @inheritance
                                        (call_expression
                                        function: (identifier) @inheritance
                                        arguments: (arguments
                                            [
                                            (identifier) @inheritance
                                            (call_expression
                                                function: (identifier) @inheritance
                                                arguments: (arguments
                                                (identifier) @inheritance
                                                )*
                                            )
                                            ]*
                                        )
                                        )
                                    ]*
                                    )
                                )
                                ]*
                            )
                            )
                        ]*
                        )
                    )
                ]
            )
        """

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
        }

    def parse_file(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        return self.parse(file_path, root_path, global_graph_info, level)

    def _get_imports(self, path: str, file_node_id: str, root_path: str) -> dict:
        parser = tree_sitter_languages.get_parser(self.language)
        language = tree_sitter_languages.get_language(self.language)
        imports_query = language.query(
            """
            (variable_declarator
                name:
                    [
                        (identifier) @imported_name
                        (object_pattern
                            (pair_pattern
                                key: (property_identifier) @imported_name
                                value: (identifier) @package_alias
                            )
                        )
                    ]
                value: (call_expression
                    function: (identifier) @function_name
                    arguments: (arguments
                        (string (string_fragment) @source_path)
                        )
                    )
                (#eq? @function_name "require")
            )
            (import_statement
                (import_clause
                    [
                        (identifier) @single_imported_name
                        (named_imports
                        (import_specifier
                            name: (identifier) @imported_name
                            alias: (identifier)? @package_alias
                        )
                        )*
                        (namespace_import (identifier) @alias)
                    ]
                    )
                source: (string
                    (string_fragment) @source_path
                    )
            )
            """
        )

        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = {"_*wildcard*_": {"path": [], "alias": "", "type": "wildcard"}}
        captured_imports = imports_query.captures(tree.root_node)

        imports_name = []
        alias = None
        packaged_alias = []
        for import_node, import_type in captured_imports:
            # Import specific objects case
            if import_type == "imported_name" or import_type == "single_imported_name":
                import_text = import_node.text.decode()
                imports_name.append(import_text)
            elif import_type == "require":
                import_text = import_node.text.decode()
                imports_name.append(import_text)
            # Aliases import case
            # import * as aliasToCall from './test'
            elif import_type == "alias":
                alias = import_node.text.decode()
            # import { ABR as resd } from './test'
            elif import_type == "package_alias":
                packaged_alias.append(import_node.text.decode())
            elif import_type == "source_path":
                from_text = import_node.text.decode()

                # import * as aliasToCall from './test'
                if alias:
                    imports[alias] = {
                        "path": self.resolve_import_path(from_text, path, root_path),
                        "alias": alias,
                        "type": "alias",
                    }
                # import { ABR as resd } from './test'
                elif len(packaged_alias) > 0:
                    for index, package_alias in enumerate(packaged_alias):
                        imports[package_alias] = {
                            "path": self.resolve_import_path(from_text, path, root_path),
                            "alias": package_alias,
                            "import_name": imports_name[index],
                            "type": "package_alias",
                        }
                else:
                    # normal import case
                    for import_name in imports_name:
                        if import_text == self.wildcard:
                            wildcard_paths = self.resolve_import_path(from_text, path, root_path)
                            imports["_*wildcard*_"]["path"].extend(
                                wildcard_paths if isinstance(wildcard_paths, list) else [wildcard_paths]
                            )
                            continue
                        imports[import_name] = {
                            "path": self.resolve_import_path(from_text, path, root_path),
                            "alias": "",
                            "type": "named_import",
                        }

                imports_name = []
                alias = None
                packaged_alias = []

        return {file_node_id: imports}
