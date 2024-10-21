from LSP import LspCaller
from ProjectFilesIterator import ProjectFilesIterator
from Graph.Node import NodeLabels, Node
from Graph.Relationship import Relationship, RelationshipType
from Folder import Folder
from typing import List
from Graph.Graph import Graph


class ProjectGraphCreator:
    def __init__(
        self,
        root_path: str,
        lsp_caller: LspCaller,
        project_files_iterator: ProjectFilesIterator,
    ):
        self.root_path = root_path
        self.lsp_caller = lsp_caller
        self.project_files_iterator = project_files_iterator
        self.graph = Graph()

    def build(self):
        for folder in self.project_files_iterator:
            folder_node = self.create_and_add_folder_node(folder)
            nodes = self.create_folder_children_nodes(folder)

            self.add_contains_relationships(folder_node, nodes)

        return self.graph

    def create_and_add_folder_node(self, folder: Folder) -> Node:
        folder_node = self.create_folder_node(folder)
        self.graph.add_node(folder_node)
        return folder_node

    def create_folder_node(self, folder: Folder) -> Node:
        return Node(label=NodeLabels.FOLDER, path=folder.path)

    def create_folder_children_nodes(self, folder: Folder) -> List[Node]:
        nodes = []
        for file in folder.files:
            nodes.append(Node(label=NodeLabels.FILE, path=file.path))

        for folder in folder.folders:
            nodes.append(Node(label=NodeLabels.FOLDER, path=folder.path))

        return nodes

    def add_contains_relationships(self, container: Node, nodes: List[Node]) -> None:
        for node in nodes:
            self.add_contains_relationship(container, node)

    def add_contains_relationship(self, parent, child):
        self.graph.add_relationship(
            Relationship(
                start_node=parent,
                end_node=child,
                rel_type=RelationshipType.CONTAINS,
            )
        )
