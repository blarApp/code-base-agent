from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents.format_scratchpad.openai_tools import (
    format_to_openai_tool_messages,
)
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from langchain.agents import AgentExecutor
from langchain.agents import tool
from graph_construction.graph_builder import GraphConstructor
from graph_construction.neo4j_manager import Neo4jManager

# Load the environment variables
load_dotenv()


def main():
    # graph_manager = Neo4jManager()
    # # graph_constructor = GraphConstructor(graph_manager)
    # # graph_constructor.build_graph("src", "python")

    # gpt-4-11-06-preview is the GPT-4 turbo model launched by OpenAI at their Dev day in 2023
    llm = ChatOpenAI(model="gpt-4-1106-preview", temperature=0)

    @tool
    def search_code(string_to_search: str) -> str:
        """Return the node looking the string in the path or the name of the function"""
        graph = Neo4jManager()
        result = graph.get_code(string_to_search)
        graph.close()
        return result

    @tool
    def search_node_by_id(node_id: str) -> str:
        """Returns node for a given node_id with all the relationships that it has (function calls, imports, class definitions, etc.) and its properties."""
        graph = Neo4jManager()
        result = graph.get_node_by_id(node_id)
        graph.close()
        return result

    tools = [
        search_code,
        search_node_by_id,
    ]

    llm_with_tools = llm.bind_tools(tools)

    # Define the chat prompt
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are very powerful code copilot, but you don't know the entire codebase. The code is represented as a graph. You need to traverse the graph to help the user with their queries.",
            ),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    # Define the agent
    agent = (
        {
            "input": lambda x: x["input"],
            "agent_scratchpad": lambda x: format_to_openai_tool_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | OpenAIToolsAgentOutputParser()
    )
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    # Run the agent
    user_task = """
    Path:
    neo4j_manager.Neo4jManager.get_code
    Error:
    Index doesn't exists
    """
    list(agent_executor.stream({"input": user_task}))
