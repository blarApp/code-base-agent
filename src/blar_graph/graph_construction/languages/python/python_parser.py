import os
from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.utils.tree_parser import get_function_name


class PythonParser(BaseParser):
    def __init__(self):
        super().__init__("python")
        self.extensions = [".py"]

    def _remove_extensions(self, file_path):
        no_extension_path = str(file_path)
        for extension in self.extensions:
            no_extension_path = no_extension_path.replace(extension, "")
        return no_extension_path

    def is_package(self, directory):
        return os.path.exists(os.path.join(directory, "__init__.py"))

    def find_module_path(self, module_name, start_dir, project_root):
        current_dir = start_dir
        components = module_name.split(".")

        # Try to find the module by traversing up towards the root until the module path is found or root is reached
        while current_dir.startswith(project_root):
            possible_path = os.path.join(current_dir, *components)
            # Check for a direct module or package
            if os.path.exists(possible_path + ".py") or self.is_package(possible_path):
                return possible_path.replace("/", ".")
            # Move one directory up
            current_dir = os.path.dirname(current_dir)
        return None

    def resolve_import_path(self, import_statement, current_file_directory, project_root):
        """
        Resolve the absolute path of an import statement.
        import_statement: The imported module as a string (e.g., 'os', 'my_package.my_module').
        current_file_directory: The directory of the file containing the import statement.
        project_root: The root directory of the project.
        """
        # Handling relative imports
        if import_statement.startswith("."):
            parent_levels = import_statement.count(".")
            relative_path = import_statement[parent_levels:].replace(".", os.sep)
            base_path = current_file_directory
            for _ in range(parent_levels - 1):
                base_path = os.path.dirname(base_path)
            absolute_path = os.path.join(base_path, relative_path)
            if os.path.exists(absolute_path + ".py"):
                return absolute_path + ".py"
            elif self.is_package(absolute_path):
                return absolute_path
        else:
            # Handling absolute imports
            return self.find_module_path(import_statement, current_file_directory, project_root)

        # If the module wasn't found, it might be a built-in or third-party module not contained within the project
        return None

    def parse_function_call(self, func_call: str, inclusive_scopes) -> tuple[str, int]:
        func_name = get_function_name(func_call)

        if func_name:
            if "self." in func_name:
                for parent in reversed(inclusive_scopes[:-1]):
                    if parent["type"] == "class_definition":
                        func_name = func_name.replace("self.", parent["name"] + ".")
                        break

            return func_name

        return None

    def skip_directory(self, directory: str) -> bool:
        return directory == "__pycache__"
