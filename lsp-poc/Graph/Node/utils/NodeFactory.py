from ..ClassNode import ClassNode
from ..FileNode import FileNode
from ..FolderNode import FolderNode
from ..FunctionNode import FunctionNode
from ..types.CodeRange import CodeRange
from LSP.SymbolKind import SymbolKind

from Files import File, Folder


class NodeFactory:
    @staticmethod
    def create_folder_node(folder: Folder) -> FolderNode:
        return FolderNode(folder.uri_path)

    @staticmethod
    def create_file_node(file: File) -> FileNode:
        return FileNode(file.uri_path)

    @staticmethod
    def create_class_node(class_name: str, path: str, definition_range: CodeRange, node_range: CodeRange) -> ClassNode:
        return ClassNode(name=class_name, path=path, definition_range=definition_range, node_range=node_range)

    @staticmethod
    def create_function_node(function_name: str, path: str, definition_range, node_range: CodeRange) -> FunctionNode:
        return FunctionNode(name=function_name, path=path, definition_range=definition_range, node_range=node_range)

    @staticmethod
    def create_node_based_on_kind(
        kind: SymbolKind, name: str, path: str, definition_range: CodeRange, node_range: CodeRange
    ):
        if kind == SymbolKind.Class:
            return NodeFactory.create_class_node(
                class_name=name, path=path, definition_range=definition_range, node_range=node_range
            )
        elif kind == SymbolKind.Function:
            return NodeFactory.create_function_node(
                function_name=name, path=path, definition_range=definition_range, node_range=node_range
            )
        else:
            return None
