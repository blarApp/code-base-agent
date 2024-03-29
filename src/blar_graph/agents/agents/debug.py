from langchain_core.utils.function_calling import convert_pydantic_to_openai_tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents.format_scratchpad.openai_tools import (
    format_to_openai_tool_messages,
)
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from blar_graph.agents.tools.KeywordSearchTool import KeywordSearchTool
from blar_graph.db_managers.base_manager import BaseDBManager
from langchain.agents import AgentExecutor
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()


def get_debug_agent(graph_manager: BaseDBManager):
    llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a code debugger, Given a problem description and an initial function, you need to find the bug in the code. You are given a graph of code functions, We purposly omited some code If the code has the comment '# Code replaced for brevity. See node_id ..... '. You can traverse the graph by calling the function keword_search. Prefer calling the function keword_search with query = node_id, only call it with starting nodes or neighbours. Explain why your solution solves the bug. Extensivley traverse the graph before giving an answer",
            ),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    tools = [KeywordSearchTool(db_manager=graph_manager)]
    llm_with_tools = llm.bind_tools(tools)

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

    return AgentExecutor(agent=agent, tools=tools, verbose=True)
