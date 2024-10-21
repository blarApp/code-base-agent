from .ClassNode import ClassNode
from .FileNode import FileNode
from .FolderNode import FolderNode
from .FunctionNode import FunctionNode

from Files import File, Folder


class NodeFactory:
    @staticmethod
    def create_folder_node(folder: Folder) -> FolderNode:
        return FolderNode(folder.path)

    @staticmethod
    def create_file_node(file: File) -> FileNode:
        return FileNode(file.path)

    @staticmethod
    def create_class_node(class_name: str, path: str) -> ClassNode:
        return ClassNode(class_name, path)

    @staticmethod
    def create_function_node(function_name: str, path: str) -> FunctionNode:
        return FunctionNode(path, function_name)
