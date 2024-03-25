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


def parse_function_call(func_call: str, inclusive_scopes) -> tuple[str, int]:
    # Regular expression to match a single function call.
    # It captures the function name and its parameters.
    pattern = re.compile(r"^([\w\.]+)\(([^)]*)\)$")

    match = pattern.match(func_call)
    if match:
        func_name = match.group(1)  # The function name
        params_str = match.group(2)  # The parameters as a single string

        num_params = count_parameters(params_str)
        if "self." in func_name:
            for parent in reversed(inclusive_scopes[:-1]):
                if parent["type"] == "class_definition":
                    func_name = func_name.replace("self.", parent["name"] + ".")
                    break

        return func_name, num_params
    else:
        return None, None


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
                    expression_identifier = expression.named_children[0].text.decode(
                        "utf-8"
                    )

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

    filtered_calls = filter(lambda x: x[0] is not None, parsed_function_calls)
    return list(map(lambda x: x[0], filtered_calls))
