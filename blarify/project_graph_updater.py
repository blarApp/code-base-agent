from blarify.project_graph_creator import ProjectGraphCreator
from dataclasses import dataclass
from typing import List


@dataclass
class UpdatedFile:
    path: str


class ProjectGraphUpdater(ProjectGraphCreator):
    updated_files: List[UpdatedFile]

    def __init__(self, updated_files: List[UpdatedFile], *args, **kwargs):
        self.updated_files = updated_files
        super().__init__(*args, **kwargs)

    def build(self):
        self.create_code_hierarchy()
        self.create_relationship_from_references_for_updated_files()
        self.keep_only_files_to_create()

        return self.graph
