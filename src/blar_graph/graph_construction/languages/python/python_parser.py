import os

import tree_sitter_languages

from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.utils.interfaces import GlobalGraphInfo


class PythonParser(BaseParser):
    def __init__(self):
        super().__init__("python", "*", ".py", ".")

    @property
    def self_syntax(self):
        return "self."

    @property
    def decompose_call_query(self):
        return """
            (attribute
                object: [
                    (identifier) @object
                    ((attribute) @nested_object
                    attribute: _ @nested_method)
                ]
                attribute: _ @method)
            """

    @property
    def assignment_query(self):
        return """(assignment left: _ @variable right: _ @expression)"""

    @property
    def function_call_query(self):
        return """(call function: _ @function_call)"""

    @property
    def scopes_names(self):
        return {"function": ["function_definition"], "class": ["class_definition"], "plain_code_block": []}

    @property
    def relation_types_map(self):
        return {"function_definition": "FUNCTION_DEFINITION", "class_definition": "CLASS_DEFINITION"}

    def _get_imports(self, path: str, file_node_id: str, root_path: str) -> dict:
        parser = tree_sitter_languages.get_parser(self.language)
        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = {"_*wildcard*_": {"path": [], "alias": "", "type": "wildcard"}}
        for node in tree.root_node.children:
            # From Statement Case
            if node.type == "import_from_statement":
                import_statements = node.named_children

                from_statement = import_statements[0]
                from_text = from_statement.text.decode()
                for import_statement in import_statements[1:]:
                    if import_statement.text.decode() == self.wildcard:
                        imports["_*wildcard*_"]["path"].append(self.resolve_import_path(from_text, path, root_path))
                    imports[import_statement.text.decode()] = {
                        "path": self.resolve_import_path(from_text, path, root_path),
                        "alias": "",
                        "type": "import_from_statement",
                    }
            # Direct Import Case
            elif node.type == "import_statement":
                import_statement = node.named_children[0]
                from_text = import_statement.text.decode()

                if import_statement.type == "aliased_import":
                    # If the import statement is aliased
                    from_statement, _, alias = import_statement.children
                    from_text = from_statement.text.decode()
                    imports[alias.text.decode()] = {
                        "path": self.resolve_import_path(from_text, path, root_path),
                        "alias": alias.text.decode(),
                        "type": "aliased_import",
                    }
                else:
                    # If it's a simple import statement
                    imports[import_statement.text.decode()] = {
                        "path": self.resolve_import_path(from_text, path, root_path),
                        "alias": "",
                        "type": "import_statement",
                    }
        return {file_node_id: imports}

    def is_package(self, directory):
        return os.path.exists(os.path.join(directory, "__init__.py"))

    def skip_directory(self, directory: str) -> bool:
        return directory == "__pycache__"

    def parse_file(self, file_path: str, root_path: str, global_graph_info: GlobalGraphInfo, level: int):
        if file_path.endswith("__init__.py"):
            return [], [], self.parse_init(file_path, root_path)
        return self.parse(file_path, root_path, global_graph_info, level)

    def parse_init(self, file_path: str, root_path: str):
        parser = tree_sitter_languages.get_parser(self.language)
        with open(file_path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))
        directory = ".".join(file_path.split(os.sep)[:-1])
        imports = {directory: []}
        temp_imports = {}
        for node in tree.root_node.children:
            if node.type == "import_from_statement":
                import_statements = node.named_children

                from_statement = import_statements[0]
                from_text = from_statement.text.decode()
                for import_statement in import_statements[1:]:
                    import_path = self.resolve_import_path(from_text, file_path, root_path)
                    if not import_path:
                        continue
                    new_import_path = import_path + "." + import_statement.text.decode()
                    import_alias = directory + "." + import_statement.text.decode()
                    imports[import_alias] = new_import_path
                    temp_imports[import_statement.text.decode()] = new_import_path
                    imports[directory].append(new_import_path)

            if node.type == "expression_statement":
                statement_children = node.children
                if statement_children[0].type == "assignment":
                    assignment = statement_children[0].named_children

                    variable_identifier = assignment[0]
                    assign_value = assignment[1]
                    if variable_identifier.text.decode() == "__all__":
                        imports[directory] = []
                        if assign_value.type == "list":
                            for child in assign_value.children:
                                if child.type == "string":
                                    for string_child in child.children:
                                        if string_child.type == "string_content":
                                            child_path = temp_imports.get(string_child.text.decode())
                                            if child_path:
                                                imports[directory].append(child_path)

        return imports
