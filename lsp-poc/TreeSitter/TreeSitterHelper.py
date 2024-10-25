from .AvailableLanguages import AvailableLanguages
from tree_sitter import Tree, Language, Parser
import tree_sitter_python as tspython
import tree_sitter_ruby as tsruby
from Graph.Node import NodeFactory, NodeLabels, Node, DefinitionRange
from Graph.Relationship import RelationshipCreator
from LSP import SymbolKind


class TreeSitterHelper:
    def __init__(self, language: AvailableLanguages):
        self.language = language
        self.parser = self._get_parser()

    def _get_parser(self):
        language = self._get_language()
        return Parser(language)

    def _get_language(self):
        if self.language == AvailableLanguages.python:
            return Language(tspython.language())

        if self.language == AvailableLanguages.ruby:
            return Language(tsruby.language())

        raise ValueError(f"Language {self.language} not supported")

    def create_nodes_and_relationships_in_file(self, file_node: Node):
        self.current_path = file_node.path
        self.created_nodes = []
        self.created_relationships = []

        if file_node.path.endswith(".py"):
            tree = self._parse(self._get_code_from_file(file_node))
            self._traverse(tree.root_node, context_stack=[file_node])

            return self.created_nodes, self.created_relationships

        return [], []

    def _parse(self, code: str) -> Tree:
        as_bytes = bytes(code, "utf-8")
        return self.parser.parse(as_bytes)

    def _get_code_from_file(self, file_node: Node):
        with open(file_node.pure_path, "r") as file:
            return file.read()

    def _traverse(self, tree_sitter_node, context_stack):
        """Perform a recursive preorder traversal of the tree."""
        if context_stack is None:
            context_stack = []

        if tree_sitter_node.type in {"class_definition", "function_definition"}:
            node, relationship = self._handle_definition_node(
                tree_sitter_node, context_stack
            )

            self.created_nodes.append(node)
            self.created_relationships.append(relationship)

            context_stack.append(node)

        for child in tree_sitter_node.children:
            self._traverse(child, context_stack)

        if tree_sitter_node.type in {"class_definition", "function_definition"}:
            context_stack.pop()

    def _handle_definition_node(self, tree_sitter_node, context_stack):
        """Handle the printing of node information for class and function definitions."""

        identifier_node = self._get_identifier_node(tree_sitter_node)
        identifier_def_range = self._get_definition_range_from_identifier_node(
            identifier_node
        )
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

        node = NodeFactory.create_node_based_on_kind(
            kind=self._get_tree_sitter_node_kind(tree_sitter_node),
            name=identifier_name,
            path=self.current_path,
            definition_range=identifier_def_range,
        )

        relationship = RelationshipCreator.create_defines_relationship(
            context_stack[-1], node
        )

        return node, relationship

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

    def _get_tree_sitter_node_kind(self, node):
        if node.type == "class_definition":
            return SymbolKind.Class
        elif node.type == "function_definition":
            return SymbolKind.Function
        else:
            return None


if __name__ == "__main__":
    ts = TreeSitterHelper(AvailableLanguages.python)
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
