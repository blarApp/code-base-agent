from blarify.graph.node import Node
import os


class DeletedNode(Node):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def _identifier(self):
        last_dir = self.get_last_dir(self.graph_environment.root_path)
        relative_path = os.path.relpath(self.pure_path, self.graph_environment.root_path)
        return f"{last_dir}{relative_path}"

    def get_last_dir(self, path):
        last_directory = os.path.basename(os.path.normpath(path))
        return "/" + last_directory + "/"
