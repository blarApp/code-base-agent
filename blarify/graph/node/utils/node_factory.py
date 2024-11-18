from ..class_node import ClassNode
from ..file_node import FileNode
from ..folder_node import FolderNode
from ..function_node import FunctionNode
from ..types.node_labels import NodeLabels

from typing import Optional, Union, TYPE_CHECKING

if TYPE_CHECKING:
    from blarify.project_file_explorer import Folder
    from blarify.code_references.types import Reference
    from tree_sitter import Node as TreeSitterNode


class NodeFactory:
    @staticmethod
    def create_folder_node(folder: "Folder", parent: FolderNode = None) -> FolderNode:
        return FolderNode(path=folder.uri_path, name=folder.name, level=folder.level, parent=parent)

    @staticmethod
    def create_file_node(
        path: str,
        name: str,
        level: int,
        node_range: "Reference",
        definition_range: "Reference",
        code_text: str,
        parent: FolderNode,
        tree_sitter_node: "TreeSitterNode",
        body_node: Optional["TreeSitterNode"] = None,
    ) -> FileNode:
        return FileNode(
            path=path,
            name=name,
            level=level,
            node_range=node_range,
            definition_range=definition_range,
            code_text=code_text,
            parent=parent,
            body_node=body_node,
            tree_sitter_node=tree_sitter_node,
        )

    @staticmethod
    def create_class_node(
        class_name: str,
        path: str,
        definition_range: "Reference",
        node_range: "Reference",
        code_text: str,
        body_node: "TreeSitterNode",
        level: int,
        tree_sitter_node: "TreeSitterNode",
        parent: Union[FileNode, ClassNode, FunctionNode] = None,
    ) -> ClassNode:
        return ClassNode(
            name=class_name,
            path=path,
            definition_range=definition_range,
            node_range=node_range,
            code_text=code_text,
            level=level,
            tree_sitter_node=tree_sitter_node,
            body_node=body_node,
            parent=parent,
        )

    @staticmethod
    def create_function_node(
        function_name: str,
        path: str,
        definition_range: "Reference",
        node_range: "Reference",
        code_text: str,
        body_node: "TreeSitterNode",
        level: int,
        tree_sitter_node: "TreeSitterNode",
        parent: Union[FileNode, ClassNode, FunctionNode] = None,
    ) -> FunctionNode:
        return FunctionNode(
            name=function_name,
            path=path,
            definition_range=definition_range,
            node_range=node_range,
            code_text=code_text,
            level=level,
            tree_sitter_node=tree_sitter_node,
            body_node=body_node,
            parent=parent,
        )

    @staticmethod
    def create_node_based_on_label(
        kind: NodeLabels,
        name: str,
        path: str,
        definition_range: "Reference",
        node_range: "Reference",
        code_text: str,
        body_node: "TreeSitterNode",
        level: int,
        tree_sitter_node: "TreeSitterNode",
        parent: Union[FileNode, ClassNode, FunctionNode] = None,
    ) -> Union[ClassNode, FunctionNode]:
        if kind == NodeLabels.CLASS:
            return NodeFactory.create_class_node(
                class_name=name,
                path=path,
                definition_range=definition_range,
                node_range=node_range,
                code_text=code_text,
                body_node=body_node,
                level=level,
                parent=parent,
                tree_sitter_node=tree_sitter_node,
            )
        elif kind == NodeLabels.FUNCTION:
            return NodeFactory.create_function_node(
                function_name=name,
                path=path,
                definition_range=definition_range,
                node_range=node_range,
                code_text=code_text,
                body_node=body_node,
                level=level,
                parent=parent,
                tree_sitter_node=tree_sitter_node,
            )
        else:
            raise ValueError(f"Kind {kind} is not supported")
