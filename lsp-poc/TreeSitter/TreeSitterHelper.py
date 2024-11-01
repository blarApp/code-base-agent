from tree_sitter import Language, Tree, Parser

from Graph.Node import NodeFactory, Node, DefinitionRange, DefinitionNode
from LSP import SymbolKind
from .Languages import LanguageDefinitions, PythonDefinitions


class TreeSitterHelper:
    language_definitions: LanguageDefinitions
    language: Language
    parser: Parser

    def __init__(self, language_definitions: LanguageDefinitions):
        self.language_definitions = language_definitions
        self.language = self.language_definitions.get_language()
        self.parser = self._get_parser()

    def _get_parser(self):
        if not self.language:
            raise Exception("Language is not set")

        return Parser(self.language)

    def create_function_call_references(self, tree_sitter_node):
        function_call_query = self.language_definitions.get_function_call_query()
        query = self.language.query(function_call_query)

        functions = query.captures(tree_sitter_node)

        return functions

    def create_nodes_and_relationships_in_file(self, file_node: Node):
        self.current_path = file_node.path
        self.created_nodes = []

        if self._does_path_have_valid_extension(file_node.path):
            code = self._get_code_from_file(file_node)
            tree = self._parse(code)
            self._traverse(tree.root_node, context_stack=[file_node], code=code)

            return self.created_nodes

        return []

    def _does_path_have_valid_extension(self, path: str):
        return any(
            path.endswith(extension)
            for extension in self.language_definitions.get_language_file_extensions()
        )

    def _parse(self, code: str) -> Tree:
        as_bytes = bytes(code, "utf-8")
        return self.parser.parse(as_bytes)

    def _get_code_from_file(self, file_node: Node):
        with open(file_node.pure_path, "r") as file:
            return file.read()

    def _traverse(self, tree_sitter_node, context_stack, code: str):
        """Perform a recursive preorder traversal of the tree."""
        if context_stack is None:
            context_stack = []

        if self._is_node_type_in_capture_group_types(tree_sitter_node.type):
            node = self._handle_definition_node(tree_sitter_node, context_stack, code)

            self.created_nodes.append(node)
            context_stack.append(node)

        for child in tree_sitter_node.children:
            self._traverse(child, context_stack, code)

        if self._is_node_type_in_capture_group_types(tree_sitter_node.type):
            context_stack.pop()

    def _is_node_type_in_capture_group_types(self, node_type):
        return node_type in self.language_definitions.get_capture_group_types()

    def _handle_definition_node(self, tree_sitter_node, context_stack, code: str):
        """Handle the printing of node information for class and function definitions."""

        identifier_node = self._get_identifier_node(tree_sitter_node)
        identifier_def_range = self._get_definition_range_from_identifier_node(
            identifier_node
        )
        node_range = self._get_node_range_from_tree_sitter_node(tree_sitter_node)
        identifier_name = identifier_node.text.decode("utf-8")

        # context = "File"
        # if len(context_stack) > 2:
        #     context = "->".join([node.name for node in context_stack])
        print(
            # f"Node type: {tree_sitter_node.type} Context: {context}, "
            f"Identifier Start: (line {identifier_def_range.start_line}, char {identifier_def_range.start_character}), "
            f"Identifier End: (line {identifier_def_range.end_line}, char {identifier_def_range.end_character})"
            f"Identifier Name: {identifier_name}"
        )

        start_line = node_range.start_line
        end_line = node_range.end_line
        code_lines = code.splitlines()
        code_snippet = "\n".join(code_lines[start_line : end_line + 1])
        parent_node = self.get_parent_node(context_stack)

        node = NodeFactory.create_node_based_on_kind(
            kind=self._get_tree_sitter_node_kind(tree_sitter_node),
            name=identifier_name,
            path=self.current_path,
            definition_range=identifier_def_range,
            node_range=node_range,
            code_text=code_snippet,
            level=parent_node.level + 1,
        )

        parent_node.relate_node_as_define_relationship(node)

        return node

    def _get_identifier_node(self, node):
        for child in node.children:
            if child.type == "identifier":
                return child
        return None

    def _get_definition_range_from_identifier_node(self, identifier_node):
        return DefinitionRange(
            identifier_node.start_point[0],
            identifier_node.start_point[1],
            identifier_node.end_point[0],
            identifier_node.end_point[1],
        )

    def _get_node_range_from_tree_sitter_node(self, node):
        return DefinitionRange(
            node.start_point[0],
            node.start_point[1],
            node.end_point[0],
            node.end_point[1],
        )

    def _get_tree_sitter_node_kind(self, node):
        if node.type == "class_definition":
            return SymbolKind.Class
        elif node.type == "function_definition":
            return SymbolKind.Function
        else:
            return None

    def get_parent_node(self, context_stack) -> DefinitionNode:
        return context_stack[-1]


if __name__ == "__main__":
    ts = TreeSitterHelper(language_definitions=PythonDefinitions())
    tree = ts._parse(
        """
        def top_function_2():
            pass

        class MyClass:
            def method(self):
                def inner_function():
                    pass
            def another_method(self):
                pass

        def top_function():
            pass
        """
    )
    ts._traverse(tree.root_node)  # Start traversal from the root node
