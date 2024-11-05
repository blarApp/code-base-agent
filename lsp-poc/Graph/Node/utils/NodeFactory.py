from ..ClassNode import ClassNode
from ..FileNode import FileNode
from ..FolderNode import FolderNode
from ..FunctionNode import FunctionNode
from LSP.SymbolKind import SymbolKind

from typing import Union, TYPE_CHECKING

if TYPE_CHECKING:
    from Files import Folder
    from ..types.CodeRange import CodeRange
    from tree_sitter import Node as TreeSitterNode


class NodeFactory:
    @staticmethod
    def create_folder_node(folder: "Folder") -> FolderNode:
        return FolderNode(path=folder.uri_path, name=folder.name, level=folder.level)

    @staticmethod
    def create_file_node(
        path: str,
        name: str,
        level: int,
        node_range: "CodeRange",
        definition_range: "CodeRange",
        code_text: str,
        tree_sitter_node: "TreeSitterNode",
    ) -> FileNode:
        return FileNode(
            path=path,
            name=name,
            level=level,
            node_range=node_range,
            definition_range=definition_range,
            code_text=code_text,
            tree_sitter_node=tree_sitter_node,
        )

    @staticmethod
    def create_class_node(
        class_name: str,
        path: str,
        definition_range: "CodeRange",
        node_range: "CodeRange",
        code_text: str,
        level: int,
        tree_sitter_node: "TreeSitterNode",
    ) -> ClassNode:
        return ClassNode(
            name=class_name,
            path=path,
            definition_range=definition_range,
            node_range=node_range,
            code_text=code_text,
            level=level,
            tree_sitter_node=tree_sitter_node,
        )

    @staticmethod
    def create_function_node(
        function_name: str,
        path: str,
        definition_range: "CodeRange",
        node_range: "CodeRange",
        code_text: str,
        level: int,
        tree_sitter_node: "TreeSitterNode",
    ) -> FunctionNode:
        return FunctionNode(
            name=function_name,
            path=path,
            definition_range=definition_range,
            node_range=node_range,
            code_text=code_text,
            level=level,
            tree_sitter_node=tree_sitter_node,
        )

    @staticmethod
    def create_node_based_on_kind(
        kind: SymbolKind,
        name: str,
        path: str,
        definition_range: "CodeRange",
        node_range: "CodeRange",
        code_text: str,
        level: int,
        tree_sitter_node: "TreeSitterNode",
    ) -> Union[ClassNode, FunctionNode]:
        if kind == SymbolKind.Class:
            return NodeFactory.create_class_node(
                class_name=name,
                path=path,
                definition_range=definition_range,
                node_range=node_range,
                code_text=code_text,
                level=level,
                tree_sitter_node=tree_sitter_node,
            )
        elif kind == SymbolKind.Function:
            return NodeFactory.create_function_node(
                function_name=name,
                path=path,
                definition_range=definition_range,
                node_range=node_range,
                code_text=code_text,
                level=level,
                tree_sitter_node=tree_sitter_node,
            )
        else:
            raise ValueError(f"Kind {kind} is not supported")
