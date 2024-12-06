from blarify.graph.node.utils.node_factory import NodeFactory
from blarify.graph.node.types.node_labels import NodeLabels
from blarify.project_graph_creator import ProjectGraphCreator
from blarify.graph.relationship import RelationshipType
from blarify.graph.graph import Graph
from blarify.graph.graph_environment import GraphEnvironment
from blarify.code_references.lsp_helper import LspQueryHelper
from blarify.project_file_explorer import ProjectFilesIterator
from blarify.graph.node import FileNode
from typing import List, Tuple
from dataclasses import dataclass
from enum import Enum
from copy import copy
from blarify.graph.external_relationship_store import ExternalRelationshipStore
from blarify.graph.graph_update import GraphUpdate
from blarify.graph.node.utils.id_calculator import IdCalculator
from blarify.utils.path_calculator import PathCalculator


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
    pr_environment: GraphEnvironment

    def __init__(
        self,
        root_path: str,
        lsp_query_helper: LspQueryHelper,
        project_files_iterator: ProjectFilesIterator,
        file_diffs: List[FileDiff],
        graph_environment: "GraphEnvironment" = None,
        pr_environment: "GraphEnvironment" = None,
    ):
        super().__init__(root_path, lsp_query_helper, project_files_iterator, graph_environment=graph_environment)
        self.graph = Graph()
        self.external_relationship_store = ExternalRelationshipStore()

        self.file_diffs = file_diffs
        self.graph_environment = graph_environment
        self.pr_environment = pr_environment

        self.added_paths = self.get_added_paths()
        self.modified_paths = self.get_modified_paths()

        self.added_and_modified_paths = self.added_paths + self.modified_paths

    def get_added_paths(self) -> List[str]:
        return [file_diff.path for file_diff in self.file_diffs if file_diff.change_type == ChangeType.ADDED]

    def get_modified_paths(self) -> List[str]:
        return [file_diff.path for file_diff in self.file_diffs if file_diff.change_type == ChangeType.MODIFIED]

    def build(self) -> GraphUpdate:
        self.create_code_hierarchy()
        self.create_relationship_from_references_for_modified_and_added_files()
        self.keep_only_files_to_create()

        self.add_deleted_relationships_and_nodes()
        self.add_relation_to_parent_folder_for_modified_paths()

        return GraphUpdate(self.graph, self.external_relationship_store)

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
            if self.is_file_node_raw(file):
                # Raw files can't be parsed, so we can't get references from them
                continue

            paths.update(self.get_paths_referenced_by_file_node(file))

        return paths

    def is_file_node_raw(self, file_node: FileNode):
        return not file_node.has_tree_sitter_node()

    def mark_file_nodes_as_diff(self, file_nodes: List[FileNode]):
        for file_node in file_nodes:
            clone_node = copy(file_node)

            diff = self.get_file_diff_for_path(file_node.path)

            file_node.add_extra_label_to_self_and_children("DIFF")
            file_node.add_extra_label_to_self_and_children(diff.change_type.value)

            file_node.add_extra_attribute_to_self_and_children("diff_text", diff.diff_text)

            file_node.update_graph_environment_to_self_and_children(self.pr_environment)

            if diff.change_type == ChangeType.MODIFIED:
                self.external_relationship_store.create_and_add_relationship(
                    start_node_id=file_node.hashed_id,
                    end_node_id=clone_node.hashed_id,
                    rel_type=RelationshipType.MODIFIED,
                )

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

    def add_deleted_relationships_and_nodes(self):
        for diff in self.file_diffs:
            if diff.change_type == ChangeType.DELETED:
                deleted_node_pr_env = NodeFactory.create_deleted_node(
                    path=diff.path,
                    graph_environment=self.pr_environment,
                    label=NodeLabels.DELETED,
                )

                path = PathCalculator.uri_to_path(diff.path)
                original_file_node_id = self.generate_file_id_from_path(path)

                self.graph.add_node(deleted_node_pr_env)
                self.external_relationship_store.create_and_add_relationship(
                    start_node_id=original_file_node_id,
                    end_node_id=deleted_node_pr_env.hashed_id,
                    rel_type=RelationshipType.DELETED,
                )

    def generate_file_id_from_path(self, path):
        relative_path = PathCalculator.compute_relative_path_with_prefix(path, self.graph_environment.root_path)
        original_file_node_id = IdCalculator.generate_hashed_file_id(
            self.graph_environment.environment, self.graph_environment.diff_identifier, relative_path
        )

        return original_file_node_id

    def add_relation_to_parent_folder_for_modified_paths(self):
        file_nodes = self.get_file_nodes_from_path_list(self.modified_paths)

        for file_node in file_nodes:
            # parent_folder = NodeFactory.create_deleted_node(
            #     path=self.get_folder_path_from_file_path(file_node.path),
            #     graph_environment=self.graph_environment,
            #     label=NodeLabels.FOLDER,
            # )

            parent_folder_path = PathCalculator.get_folder_path_from_file_path(file_node.pure_path)
            parent_folder_path = PathCalculator.compute_relative_path_with_prefix(
                parent_folder_path, self.graph_environment.root_path
            )

            parent_folder_id = IdCalculator.generate_hashed_file_id(
                self.graph_environment.environment, self.graph_environment.diff_identifier, parent_folder_path
            )

            print(
                IdCalculator.generate_file_id(
                    self.graph_environment.environment, self.graph_environment.diff_identifier, parent_folder_path
                ),
                "<=",
                file_node.id,
            )

            self.external_relationship_store.create_and_add_relationship(
                start_node_id=parent_folder_id, end_node_id=file_node.hashed_id, rel_type=RelationshipType.CONTAINS
            )

    def get_folder_path_from_file_path(self, file_path):
        return "/".join(file_path.split("/")[:-1])
