from .ClassNode import ClassNode
from .FileNode import FileNode
from .FolderNode import FolderNode
from .FunctionNode import FunctionNode
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
    def create_class_node(class_name: str, path: str) -> ClassNode:
        return ClassNode(class_name, path)

    @staticmethod
    def create_function_node(function_name: str, path: str) -> FunctionNode:
        return FunctionNode(path, function_name)

    @staticmethod
    def create_node_based_on_kind(kind: SymbolKind, name: str, path: str):
        if kind == SymbolKind.Class:
            return NodeFactory.create_class_node(name, path)
        elif kind == SymbolKind.Function:
            return NodeFactory.create_function_node(name, path)

        else:
            return None
