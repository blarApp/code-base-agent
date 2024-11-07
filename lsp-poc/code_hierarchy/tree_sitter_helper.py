from tree_sitter import Language, Tree, Parser

from graph.node import NodeFactory
from LSP.types import SymbolKind, Reference, Range, Point
from .Languages import LanguageDefinitions
from project_file_explorer import File

from typing import List, TYPE_CHECKING, Optional
from graph.relationship import RelationshipType

if TYPE_CHECKING:
    from tree_sitter import Node as TreeSitterNode
    from graph.node import DefinitionNode, Node, FolderNode
    from LSP.types import Reference


class TreeSitterHelper:
    language_definitions: LanguageDefinitions
    language: Language
    parser: Parser
    current_path: str
    base_node_source_code: str
    created_nodes: List["Node"]

    def __init__(self, language_definitions: LanguageDefinitions):
        self.language_definitions = language_definitions
        self.language = self.language_definitions.get_language()
        self.parser = self._get_parser()

    def _get_parser(self) -> Parser:
        if not self.language:
            raise Exception("Language is not set")

        return Parser(self.language)

    def get_reference_type(
        self, original_node: "DefinitionNode", reference: "Reference", node_referenced: "DefinitionNode"
    ) -> RelationshipType:
        node_label = original_node.label
        node_in_point_reference = self._get_node_in_point_reference(node=node_referenced, reference=reference)
        type_found = self._find_relationship_type(
            node_label=node_label, node_in_point_reference=node_in_point_reference
        )

        return type_found if type_found is not None else RelationshipType.USES

    def _get_node_in_point_reference(self, node: "DefinitionNode", reference: "Reference") -> "TreeSitterNode":
        # Get the tree-sitter node for the reference
        start_point = (reference.range.start.line, reference.range.start.character)
        end_point = (reference.range.end.line, reference.range.end.character)

        return node._tree_sitter_node.descendant_for_point_range(start_point, end_point)

    def _find_relationship_type(
        self, node_label: str, node_in_point_reference: "TreeSitterNode"
    ) -> Optional[RelationshipType]:
        # Traverse up to find the named parent
        named_parent = node_in_point_reference
        rel_types = self.language_definitions.get_relationships_group_types()
        type_found = None

        while named_parent is not None and type_found is None:
            type_found = self._get_tree_sitter_node_relationship_type(
                tree_sitter_node=named_parent, relationships_types=rel_types[node_label]
            )
            named_parent = named_parent.parent
        return type_found

    def _get_tree_sitter_node_relationship_type(
        self, tree_sitter_node: "TreeSitterNode", relationships_types: dict
    ) -> Optional[RelationshipType]:
        if tree_sitter_node is None:
            return None

        return relationships_types.get(tree_sitter_node.type, None)

    def create_nodes_and_relationships_in_file(self, file: File, parent_folder: "FolderNode" = None) -> List["Node"]:
        self.current_path = file.uri_path
        self.created_nodes = []
        self.base_node_source_code = self._get_content_from_file(file)

        if self._does_path_have_valid_extension(file.uri_path):
            self._handle_paths_with_valid_extension(file=file, parent_folder=parent_folder)
            return self.created_nodes

        file_node = self._create_file_node_from_raw_file(file, parent_folder)
        return [file_node]

    def _does_path_have_valid_extension(self, path: str) -> bool:
        return any(path.endswith(extension) for extension in self.language_definitions.get_language_file_extensions())

    def _handle_paths_with_valid_extension(self, file: File, parent_folder: "FolderNode" = None) -> None:
        tree = self._parse(self.base_node_source_code)

        file_node = self._create_file_node_from_module_node(
            module_node=tree.root_node, file=file, parent_folder=parent_folder
        )
        self.created_nodes.append(file_node)

        self._traverse(tree.root_node, context_stack=[file_node])

    def _parse(self, code: str) -> Tree:
        as_bytes = bytes(code, "utf-8")
        return self.parser.parse(as_bytes)

    def _create_file_node_from_module_node(
        self, module_node: "TreeSitterNode", file: File, parent_folder: "FolderNode" = None
    ) -> "Node":
        print(f"Creating file node for {file.uri_path}")
        return NodeFactory.create_file_node(
            path=file.uri_path,
            name=file.name,
            level=file.level,
            node_range=self._get_reference_from_node(module_node),
            definition_range=self._get_reference_from_node(module_node),
            code_text=self.base_node_source_code,
            body_text=self.base_node_source_code,
            parent=parent_folder,
            tree_sitter_node=module_node,
        )

    def _get_content_from_file(self, file: File) -> str:
        try:
            with open(file.path, "r") as file:
                return file.read()
        except UnicodeDecodeError:
            # if content cannot be read, return empty string
            return ""

    def _traverse(self, tree_sitter_node: "TreeSitterNode", context_stack: List["Node"]) -> None:
        """Perform a recursive preorder traversal of the tree."""
        if context_stack is None:
            context_stack = []

        if self._is_node_type_in_capture_group_types(tree_sitter_node.type):
            node = self._handle_definition_node(tree_sitter_node, context_stack)

            self.created_nodes.append(node)
            context_stack.append(node)

        for child in tree_sitter_node.children:
            self._traverse(child, context_stack)

        if self._is_node_type_in_capture_group_types(tree_sitter_node.type):
            context_stack.pop()

    def _is_node_type_in_capture_group_types(self, node_type: str) -> bool:
        return node_type in self.language_definitions.get_capture_group_types()

    def _handle_definition_node(self, tree_sitter_node: "TreeSitterNode", context_stack: List["Node"]) -> "Node":
        """Handle the printing of node information for class and function definitions."""
        identifier_node = self._get_identifier_node(tree_sitter_node)
        identifier_def_range = self._get_reference_from_node(node=identifier_node)
        identifier_name = self.get_identifier_name(identifier_node=identifier_node)

        node_reference = self._get_reference_from_node(node=tree_sitter_node)
        code_snippet = self._get_code_snippet_from_base_file(node_reference.range)

        body_node = self._get_block_node(tree_sitter_node)
        node_reference = self._get_reference_from_node(node=body_node)
        body_snippet = self._get_code_snippet_from_base_file(node_reference.range)

        parent_node = self.get_parent_node(context_stack)

        node = NodeFactory.create_node_based_on_kind(
            kind=self._get_tree_sitter_node_kind(tree_sitter_node),
            name=identifier_name,
            path=self.current_path,
            definition_range=identifier_def_range,
            node_range=node_reference,
            code_text=code_snippet,
            body_text=body_snippet,
            level=parent_node.level + 1,
            parent=parent_node,
            tree_sitter_node=tree_sitter_node,
        )

        parent_node.relate_node_as_define_relationship(node)
        return node

    def get_identifier_name(self, identifier_node: str) -> str:
        identifier_name = identifier_node.text.decode("utf-8")
        return identifier_name

    def _get_code_snippet_from_base_file(self, node_range: "Range") -> str:
        start_line = node_range.start.line
        end_line = node_range.start.line
        code_lines = self.base_node_source_code.split("\n")
        code_snippet = "\n".join(code_lines[start_line : end_line + 1])
        return code_snippet

    def _get_identifier_node(self, node: "TreeSitterNode") -> "TreeSitterNode":
        for child in node.children:
            if child.type == "identifier":
                return child
        return None

    def _get_reference_from_node(self, node: "TreeSitterNode") -> "Reference":
        return Reference(
            range=Range(
                start=Point(line=node.start_point[0], character=node.start_point[1]),
                end=Point(line=node.end_point[0], character=node.end_point[1]),
            ),
            uri=self.current_path,
        )

    def _get_tree_sitter_node_kind(self, node: "TreeSitterNode") -> SymbolKind:
        if node.type == "class_definition":
            return SymbolKind.Class
        elif node.type == "function_definition":
            return SymbolKind.Function
        else:
            return None

    def get_parent_node(self, context_stack: List["Node"]) -> "DefinitionNode":
        return context_stack[-1]

    def _create_file_node_from_raw_file(self, file: File, parent_folder: "FolderNode" = None) -> "Node":
        return NodeFactory.create_file_node(
            path=file.uri_path,
            name=file.name,
            level=file.level,
            node_range=self._empty_reference(),
            definition_range=self._empty_reference(),
            code_text=self.base_node_source_code,
            body_text=self.base_node_source_code,
            parent=parent_folder,
            tree_sitter_node=None,
        )

    def _empty_reference(self) -> "Reference":
        return Reference(
            range=Range(
                start=Point(line=0, character=0),
                end=Point(line=0, character=0),
            ),
            uri=self.current_path,
        )

    def _get_block_node(self, node: "TreeSitterNode") -> "TreeSitterNode":
        for child in node.children:
            if child.type == "block":
                return child
        return None
