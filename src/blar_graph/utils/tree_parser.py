import tree_sitter_languages
import os
import re


def traverse_tree(tree):
    cursor = tree.walk()
    visited_children = False
    while True:
        if not visited_children:
            yield cursor.node
            if not cursor.goto_first_child():
                visited_children = True
        elif cursor.goto_next_sibling():
            visited_children = False
        elif not cursor.goto_parent():
            break


def count_parameters(params_str):
    # Count parameters considering string literals and ignoring commas within them.
    # This simplistic approach assumes balanced quotes and no escaped quotes within strings.
    in_string = False
    param_count = (
        0 if not params_str else 1
    )  # Start with 1 parameter if the string is not empty

    for char in params_str:
        if char == '"':
            in_string = not in_string  # Toggle state
        elif char == "," and not in_string:
            param_count += (
                1  # Count commas outside of string literals as parameter separators
            )

    # Edge case for empty parameter list or only spaces
    if param_count == 1 and not params_str.strip():
        return 0

    return param_count


def get_function_name(call_str):
    match = re.match(r"([a-zA-Z_][\w\.]*)\s*\(", call_str)
    if match:
        return match.group(1)  # Return the captured function name
    else:
        return None  # No function name found


def parse_function_call(func_call: str, inclusive_scopes) -> tuple[str, int]:
    func_name = get_function_name(func_call)

    if func_name:
        if "self." in func_name:
            for parent in reversed(inclusive_scopes[:-1]):
                if parent["type"] == "class_definition":
                    func_name = func_name.replace("self.", parent["name"] + ".")
                    break

        return func_name

    return None


def get_function_calls(node, assigments_dict: dict) -> list[str]:
    code_text = node.text

    parser = tree_sitter_languages.get_parser("python")
    tree = parser.parse(bytes(code_text, "utf-8"))
    node_names = map(lambda node: node, traverse_tree(tree))

    function_calls = []

    for tree_node in node_names:
        if tree_node.type == "expression_statement":
            statement_children = tree_node.children
            if statement_children[0].type == "assignment":
                assigment = statement_children[0].named_children

                variable_identifier = assigment[0]
                assign_value = assigment[1]
                if assign_value.type == "call":
                    expression = assign_value
                    expression_identifier = expression.named_children[0].text.decode()

                    assigments_dict[variable_identifier.text.decode("utf-8")] = (
                        expression_identifier
                    )

        if tree_node.type == "call":
            call_children = tree_node.named_children
            if (
                call_children[0].type == "attribute"
                and call_children[1].type == "argument_list"
            ):
                attribute_children = call_children[0].named_children
                root_caller = attribute_children[0]
                if root_caller.type == "identifier":
                    root_caller_identifier = root_caller.text.decode("utf-8")
                    if root_caller_identifier in assigments_dict:
                        function_calls.append(
                            assigments_dict[root_caller_identifier]
                            + "."
                            + attribute_children[1].text.decode("utf-8")
                            + "()"
                        )
                        continue
            function_calls.append(tree_node.text.decode("utf-8"))

    parsed_function_calls = map(
        lambda x: parse_function_call(x, node.metadata["inclusive_scopes"]),
        function_calls,
    )

    filtered_calls = filter(lambda x: x is not None, parsed_function_calls)
    return list(filtered_calls)


def is_package(directory):
    return os.path.exists(os.path.join(directory, "__init__.py"))


def find_module_path(module_name, start_dir, project_root):
    current_dir = start_dir
    components = module_name.split(".")

    # Try to find the module by traversing up towards the root until the module path is found or root is reached
    while current_dir.startswith(project_root):
        possible_path = os.path.join(current_dir, *components)
        # Check for a direct module or package
        if os.path.exists(possible_path + ".py") or is_package(possible_path):
            return possible_path.replace("/", ".")
        # Move one directory up
        current_dir = os.path.dirname(current_dir)
    return None


def resolve_import_path(import_statement, current_file_directory, project_root):
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
        elif is_package(absolute_path):
            return absolute_path
    else:
        # Handling absolute imports
        return find_module_path(import_statement, current_file_directory, project_root)

    # If the module wasn't found, it might be a built-in or third-party module not contained within the project
    return None
