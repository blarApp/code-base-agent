from AvailableLanguages import AvailableLanguages
from tree_sitter import Tree, Language, Parser
import tree_sitter_python as tspython


class TreeSitterCaller:
    def __init__(self, language: AvailableLanguages):
        self.language = language
        self.parser = self.get_parser()

    def get_parser(self):
        language = self.get_language()
        return Parser(language)

    def get_language(self):
        if self.language == AvailableLanguages.python:
            return Language(tspython.language())

    def parse(self, code: str) -> Tree:
        as_bytes = bytes(code, "utf-8")
        return self.parser.parse(as_bytes)

    def traverse(self, node, context_stack=None):
        """Perform a recursive preorder traversal of the tree."""
        if context_stack is None:
            context_stack = []

        if node.type in {"class_definition", "function_definition"}:
            self.handle_definition_node(node, context_stack)
            context_stack.append(node.type)

        for child in node.children:
            self.traverse(child, context_stack)

        if node.type in {"class_definition", "function_definition"}:
            context_stack.pop()

    def handle_definition_node(self, node, context_stack):
        """Handle the printing of node information for class and function definitions."""
        start_line, start_char = node.start_point
        end_line, end_char = node.end_point

        identifier_node = self.get_identifier_node(node)
        identifier_start = (
            identifier_node.start_point if identifier_node else (None, None)
        )
        identifier_end = identifier_node.end_point if identifier_node else (None, None)

        context = "->".join(context_stack) if context_stack else ""
        print(
            f"Node type: {node.type} Context: {context}, "
            f"Start: (line {start_line + 1}, char {start_char + 1}), "
            f"End: (line {end_line + 1}, char {end_char + 1}), "
            f"Identifier Start: (line {identifier_start[0] + 1}, char {identifier_start[1] + 1}), "
            f"Identifier End: (line {identifier_end[0] + 1}, char {identifier_end[1] + 1})"
        )

    def get_identifier_node(self, node):
        for child in node.children:
            if child.type == "identifier":
                return child
        return None


if __name__ == "__main__":
    ts = TreeSitterCaller(AvailableLanguages.python)
    tree = ts.parse(
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
    ts.traverse(tree.root_node)  # Start traversal from the root node
