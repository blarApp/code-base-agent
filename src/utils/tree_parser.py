import tree_sitter_languages
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


def parse_function_call(func_call_bytes: bytes, inclusive_scopes) -> tuple[str, int]:
    # Regular expression to match a single function call.
    # It captures the function name and its parameters.
    pattern = re.compile(r"^([\w\.]+)\(([^)]*)\)$")

    func_call_str = func_call_bytes.decode("utf-8")
    match = pattern.match(func_call_str)
    if match:
        func_name = match.group(1)  # The function name
        params_str = match.group(2)  # The parameters as a single string

        num_params = count_parameters(params_str)
        for parent in reversed(inclusive_scopes):
            func_name = parent["name"] + "." + func_name

        return func_name, num_params
    else:
        return None, None


def get_function_calls(node) -> list[str]:
    code_text = node.text

    parser = tree_sitter_languages.get_parser("python")
    tree = parser.parse(bytes(code_text, "utf-8"))
    node_names = map(lambda node: node, traverse_tree(tree))
    function_calls = []
    for tree_node in node_names:
        if tree_node.type == "call":
            function_calls.append(tree_node.text)

    parsed_function_calls = map(
        lambda x: parse_function_call(x, node.metadata["inclusive_scopes"]),
        function_calls,
    )

    file_path = node.metadata["filepath"].replace(".py", "").replace("/", ".")
    return list(map(lambda x: file_path + "." + x[0], parsed_function_calls))
