from blar_graph.graph_construction.language_classes.graph_file_parser import GraphFileParser


class PythonFile(GraphFileParser):
    def __init__(self, file_path: str, root_path: str, directory_path: str, visited_nodes: dict, global_imports: dict):
        language = "python"
        extensions = [".py"]
        super().__init__(file_path, root_path, language, directory_path, visited_nodes, global_imports, extensions)

    def parse_init(self, node):
        split_nodes = self.parse()
        return split_nodes

    def parse_file(self):
        if self.file_path == "__init__.py":
            return self.parse_init()
        return self._parse_file()
