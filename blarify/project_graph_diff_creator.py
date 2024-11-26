from blarify.project_graph_creator import ProjectGraphCreator
from blarify.graph.relationship import RelationshipType
from blarify.graph.graph import Graph
from blarify.graph.graph_environment import GraphEnvironment
from blarify.code_references.lsp_helper import LspQueryHelper
from blarify.project_file_explorer import ProjectFilesIterator
from blarify.graph.node import FileNode
from typing import List
from dataclasses import dataclass
from enum import Enum
from copy import copy


class ChangeType(Enum):
    ADDED = "ADDED"
    MODIFIED = "MODIFIED"
    DELETED = "DELETED"


@dataclass
class FileDiff:
    path: str
    diff_text: str
    change_type: ChangeType


class ProjectGraphDiffCreator(ProjectGraphCreator):
    diff_identifier: str
    added_and_modified_paths: List[str]
    file_diffs: List[FileDiff]

    def __init__(
        self,
        root_path: str,
        lsp_query_helper: LspQueryHelper,
        project_files_iterator: ProjectFilesIterator,
        file_diffs: List[FileDiff],
        graph_environment: "GraphEnvironment" = None,
    ):
        super().__init__(root_path, lsp_query_helper, project_files_iterator, graph_environment=graph_environment)
        self.graph = Graph()
        self.file_diffs = file_diffs

        self.added_and_modified_paths = self.get_added_and_modified_paths()

    def get_added_and_modified_paths(self) -> List[str]:
        return [
            file_diff.path
            for file_diff in self.file_diffs
            if file_diff.change_type in [ChangeType.ADDED, ChangeType.MODIFIED]
        ]

    def build(self) -> Graph:
        self.create_code_hierarchy()
        self.create_relationship_from_references_for_modified_and_added_files()
        self.keep_only_files_to_create()

        return self.graph

    def keep_only_files_to_create(self):
        self.graph = self.graph.filtered_graph_by_paths(self.added_and_modified_paths)

    def create_relationship_from_references_for_modified_and_added_files(self):
        file_nodes = self.get_file_nodes_from_path_list(self.added_and_modified_paths)

        self.mark_file_nodes_as_diff(file_nodes)

        paths = self.get_paths_referenced_by_file_nodes(file_nodes)
        paths = self.remove_paths_to_create_from_paths_referenced(paths)

        file_nodes.extend(self.get_file_nodes_from_path_list(paths))
        self.create_relationship_from_references(file_nodes=file_nodes)

    def get_paths_referenced_by_file_nodes(self, file_nodes):
        paths = set()
        for file in file_nodes:
            paths.update(self.get_paths_referenced_by_file_node(file))
        return paths

    def mark_file_nodes_as_diff(self, file_nodes: List[FileNode]):
        for file_node in file_nodes:
            clone_node = copy(file_node)

            diff = self.get_file_diff_for_path(file_node.path)

            file_node.add_extra_label_to_self_and_children("DIFF")
            file_node.add_extra_label_to_self_and_children(diff.change_type.value)

            file_node.add_extra_attribute_to_self_and_children("diff_identifier", self.graph_environment.pr_id)
            file_node.add_extra_attribute("diff_text", diff.diff_text)

            file_node.update_graph_environment_to_self_and_children(self.graph_environment)

            if diff.change_type == ChangeType.MODIFIED:
                self.graph.add_custom_relationship(file_node, clone_node, RelationshipType.MODIFIED)

    def get_file_diff_for_path(self, path):
        for file_diff in self.file_diffs:
            if file_diff.path == path:
                return file_diff

        raise ValueError(f"Path {path} not found in file diffs")

    def remove_paths_to_create_from_paths_referenced(self, paths_referenced):
        return [path for path in paths_referenced if path not in self.added_and_modified_paths]

    def get_paths_referenced_by_file_node(self, file_node: FileNode) -> set:
        helper = self._get_tree_sitter_for_file_extension(file_node.extension)
        definitions = file_node.get_all_definition_ranges()
        identifiers = helper.get_all_identifiers(file_node)
        filtered_identifiers = self.remove_definitions_from_identifiers(definitions, identifiers)

        return {self.lsp_query_helper.get_definition_path_for_reference(ref) for ref in filtered_identifiers}

    def remove_definitions_from_identifiers(self, definitions, identifiers):
        return [identifier for identifier in identifiers if identifier not in definitions]

    def get_file_nodes_from_path_list(self, paths):
        file_nodes = []
        for path in paths:
            file_node = self.graph.get_file_node_by_path(path)

            if file_node:
                file_nodes.append(file_node)
        return file_nodes
