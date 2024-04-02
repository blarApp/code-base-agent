from blar_graph.graph_construction.language_classes.graph_file_parser import GraphFileParser
import tree_sitter_languages
from blar_graph.utils import tree_parser
import os


class PythonFile(GraphFileParser):
    def __init__(self, file_path: str, root_path: str, directory_path: str, visited_nodes: dict, global_imports: dict):
        language = "python"
        extensions = [".py"]
        super().__init__(file_path, root_path, language, directory_path, visited_nodes, global_imports, extensions)

    def parse_init(self):
        parser = tree_sitter_languages.get_parser(self.language)
        with open(str(self.file_path), "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))
        imports = {}
        for node in tree.root_node.children:
            if node.type == "import_from_statement":
                import_statements = node.named_children

                from_statement = import_statements[0]
                from_text = from_statement.text.decode()
                for import_statement in import_statements[1:]:
                    import_path = tree_parser.resolve_import_path(from_text, str(self.file_path), self.root_path)
                    new_import_path = import_path + "." + import_statement.text.decode()
                    import_alias = (
                        ".".join(str(self.file_path).split(os.sep)[:-1]) + "." + import_statement.text.decode()
                    )
                    imports[import_alias] = new_import_path

        return imports

    def parse_file(self):
        if str(self.file_path).endswith("__init__.py"):
            return [], [], self.parse_init()
        return self._parse_file()
