from dotenv import load_dotenv
from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad.openai_tools import (
    format_to_openai_tool_messages,
)
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from blar_graph.agents_tools.tools import GetCodeByIdTool, KeywordSearchTool
from blar_graph.db_managers.base_manager import BaseDBManager

load_dotenv()


def get_metamate_agent(graph_manager: BaseDBManager):
    llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """
                You are a senior software developer in a enterprise. Your job is to help the junior developers to understand the codebase and make changes to the codebase.
                You don't give the code directly, you guide them to the code by giving them the file, class or functions that they need to look at.
                Also, include an analysis of the possible repercusions of the changes they are going to make, pointing to the files and functions that could be affected.
                You can traverse the graph by calling the function keword_search.
                You are given a graph of code functions, We purposly omitted some code If the code has the comment '# Code replaced for brevity. See node_id ..... '.
                Prefer calling the function keword_search with query = node_id, only call it with starting nodes or neighbours.
                Extensivley traverse the graph before giving an answer.
                Output the final files you would suggest the junior developer to look at in JSON format:
                {{
                    'files_to_look_at': List,
                    'file_to_modify': List,
                    'functions_to_modify': List
                }}
                """,
            ),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    tools = [KeywordSearchTool(db_manager=graph_manager), GetCodeByIdTool(db_manager=graph_manager)]
    llm_with_tools = llm.bind_tools(tools)

    agent = (
        {
            "input": lambda x: x["input"],
            "agent_scratchpad": lambda x: format_to_openai_tool_messages(x["intermediate_steps"]),
        }
        | prompt
        | llm_with_tools
        | OpenAIToolsAgentOutputParser()
    )

    return AgentExecutor(agent=agent, tools=tools, verbose=True)
