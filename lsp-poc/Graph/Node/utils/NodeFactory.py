from ..ClassNode import ClassNode
from ..FileNode import FileNode
from ..FolderNode import FolderNode
from ..FunctionNode import FunctionNode
from LSP.SymbolKind import SymbolKind

from Files import File, Folder
from typing import Union, TYPE_CHECKING

if TYPE_CHECKING:
    from ..types.CodeRange import CodeRange


class NodeFactory:
    @staticmethod
    def create_folder_node(folder: Folder) -> FolderNode:
        return FolderNode(folder.uri_path, folder.name, folder.level)

    @staticmethod
    def create_file_node_from_file(file: File) -> FileNode:
        return FileNode(file.uri_path, file.name, level=file.level)

    @staticmethod
    def create_file_node(
        path: str, name: str, level: int, node_range: "CodeRange", definition_range: "CodeRange", code_text: str
    ) -> FileNode:
        return FileNode(
            path=path,
            name=name,
            level=level,
            node_range=node_range,
            definition_range=definition_range,
            code_text=code_text,
        )

    @staticmethod
    def create_class_node(
        class_name: str,
        path: str,
        definition_range: "CodeRange",
        node_range: "CodeRange",
        code_text: str,
        level: int,
    ) -> ClassNode:
        return ClassNode(class_name, path, definition_range, node_range, code_text, level)

    @staticmethod
    def create_function_node(
        function_name: str,
        path: str,
        definition_range: "CodeRange",
        node_range: "CodeRange",
        code_text: str,
        level: int,
    ) -> FunctionNode:
        return FunctionNode(path, function_name, definition_range, node_range, code_text, level)

    @staticmethod
    def create_node_based_on_kind(
        kind: SymbolKind,
        name: str,
        path: str,
        definition_range: "CodeRange",
        node_range: "CodeRange",
        code_text: str,
        level: int,
    ) -> Union[ClassNode, FunctionNode]:
        if kind == SymbolKind.Class:
            return NodeFactory.create_class_node(name, path, definition_range, node_range, code_text, level)
        elif kind == SymbolKind.Function:
            return NodeFactory.create_function_node(name, path, definition_range, node_range, code_text, level)
        else:
            raise ValueError(f"Kind {kind} is not supported")
