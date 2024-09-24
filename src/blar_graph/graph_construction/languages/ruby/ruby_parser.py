import os

import tree_sitter_languages
from tree_sitter import Language, Node, Parser

from blar_graph.graph_construction.languages.base_parser import BaseParser
from blar_graph.graph_construction.utils.interfaces.GlobalGraphInfo import (
    GlobalGraphInfo,
)


class RubyParser(BaseParser):
    arguments_in_function_call: bool = True

    def __init__(self, global_graph_info: GlobalGraphInfo):
        super().__init__("ruby", None, ".rb", "/", global_graph_info)

    @property
    def self_syntax(self):
        return "self."

    @property
    def decompose_call_query(self):
        return """
            (call
                [(identifier) (constant) (instance_variable)] @call_parts
                (argument_list)? @arguments)
            (simple_symbol) @simple_symbol
            (program
	            (identifier) @call_parts)
        """

    @property
    def assignment_query(self):
        return """
            (assignment
                left: _ @variable
                right: _ @expression
            )
        """

    @property
    def function_call_query(self):
        return """
            (body_statement
                (identifier) @function_call)
            (if_modifier
                (identifier) @function_call)
            (then
                (identifier) @function_call)
            (program
                (identifier) @function_call)
            ((call) @function_call
            (#not-match? @function_call "^(after|around|before)_action"))
            ((call
                arguments: (argument_list
                    (simple_symbol) @symbol_call)) @symbol_parent
            (#match? @symbol_parent "^(after|around|before)_action"))
            ((call
                arguments: (argument_list
                    (pair
                        value: (simple_symbol) @symbol_call))) @symbol_parent
            (#match? @symbol_parent "^(after|around|before)_action"))
            ((call
                arguments: (argument_list
                    (pair
                        value: (array
                            (simple_symbol) @symbol_call)))) @symbol_parent
            (#match? @symbol_parent "^(after|around|before)_action"))
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
            "class": ["class", "module"],
            "plain_code_block": [],
        }

    @property
    def relation_types_map(self):
        return {
            "method": "FUNCTION_DEFINITION",
            "class": "CLASS_DEFINITION",
            "module": "CLASS_DEFINITION",
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

        # Check for Zeitwerk autoloaded modules
        # This query is basically checkinhg if the file is using a module that is autoloaded
        # This could be a class inheritance, a method call or a module use via include
        query_for_module_use = f"""
            {self.inheritances_query}
            (call
	            receiver: (constant) @module)
        """
        inheritance_query = language.query(query_for_module_use)
        captured_inheritances = inheritance_query.captures(tree.root_node)

        for node, node_type in captured_inheritances:
            if node_type in ["inheritance", "module"]:
                module_name = node.text.decode()
                if module_name in self.global_graph_info.autoloaded_modules:
                    imports[module_name] = self.global_graph_info.autoloaded_modules[module_name]

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

    def _get_modules_from_path(self, path: str) -> str:
        # Convert file path to module name
        parts = path.split(os.sep)
        parts = [part.replace(".rb", "") for part in parts]
        directory = ".".join(parts)

        parser = tree_sitter_languages.get_parser(self.language)
        language = tree_sitter_languages.get_language(self.language)
        modules_query = language.query(
            """
            (module
                name: (constant) @module)
            (module
                name: (constant)
                body: (body_statement
                    (class
                        name: (constant) @class)))
            (class
	            name: (constant) @class)
            """
        )

        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        captured_modules = modules_query.captures(tree.root_node)

        module_to__import = ""
        modules = []
        for module_node, module_type in captured_modules:
            if module_type == "module":
                module = module_node.text.decode()
                module_to__import = module if module_to__import == "" else module_to__import + "." + module
            if module_type == "class":
                class_name = module_node.text.decode()
                module_to__import = class_name if module_to__import == "" else module_to__import + "." + class_name
                modules.append(module_to__import)
                module_to__import = ""
        if module_to__import != "":
            modules.append(module_to__import)

        return directory, modules

    # TODO: Refactor this method to be more generic
    # This is made to be able to precompute autoloaded modules for Ruby on Rails projects
    def _precompute_autoloaded_modules(self, root_path: str, global_graph_info: GlobalGraphInfo) -> dict:
        autoload_base_path = os.path.join(root_path, "app")
        autoloaded_modules = {}
        for root, _, files in os.walk(autoload_base_path):
            for file in files:
                if file.endswith(".rb"):
                    file_path = os.path.join(root, file)
                    directory, modules = self._get_modules_from_path(file_path)
                    for module_name in modules:
                        autoloaded_modules[module_name] = {
                            "path": directory,
                            "type": "import_name",
                        }
        global_graph_info.autoloaded_modules = autoloaded_modules

    def _decompose_function_call(self, call_node: Node, language: Language, parser: Parser):
        calls_query = language.query(self.decompose_call_query)

        call_tree = parser.parse(call_node.text)
        decompose_call = calls_query.captures(call_tree.root_node)

        list_decomposed_calls = []

        # Capture the method parts from the decompose_call query result
        for node, node_type in decompose_call:
            if node_type == "call_parts":
                call_parts = node.text.decode()
                list_decomposed_calls.append(call_parts)
            elif node_type == "arguments":
                break
            elif node_type == "simple_symbol":
                simple_symbol = node.text.decode()
                list_decomposed_calls.append(simple_symbol.split(":")[1])

        # Start the recursive extraction from the root call node
        return list_decomposed_calls

    # Helper function to find the parent of a node
    def get_parent(self, node: Node):
        return node.parent

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

        for call_node, call_type in function_calls_nodes:
            if call_type == "symbol_parent":
                continue
            # Skip if the parent node is a 'call' (to avoid nested calls)
            parent_node = self.get_parent(call_node)
            if parent_node and parent_node.type == "call":
                continue
            if method_name and call_node.text.decode() == method_name:
                continue

            decomposed_call = self._decompose_function_call(call_node, language, parser)
            if not decomposed_call:
                continue

            if call_type == "symbol_call":
                if class_name:
                    decomposed_call.insert(0, class_name)

            called_from_assignment = False
            join_call = decomposed_call[0]
            for index, call in enumerate(decomposed_call):
                if index != 0:
                    join_call += "." + call

                if assignments_dict.get(join_call):
                    function_calls.append(assignments_dict[join_call] + "." + ".".join(decomposed_call[index + 1 :]))
                    called_from_assignment = True
                    break

            if not called_from_assignment:
                node_text = (
                    call_node.text.decode() if not self.arguments_in_function_call else ".".join(decomposed_call)
                )
                # The function call could be a method call or a plain function call, we have to check both cases
                # First we check if the call is a method call, if it is, we append the class name to the
                # function call. Second, we append the function call to the list of function calls
                # if the call is not a method call
                if len(decomposed_call) > 1:
                    if class_name:
                        function_calls.append(class_name + "." + node_text)
                    function_calls.append(node_text)
                if class_name:
                    function_calls.append(class_name + "." + decomposed_call[0])

        return function_calls
