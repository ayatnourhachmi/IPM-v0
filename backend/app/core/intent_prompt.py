# Intent prompt builder for LLM calls

def build_intent_prompt(
    explicit: str,
    implicit: str,
    strategic: str,
    context: str,
    *,
    require_dxc_positioning: bool = True,
) -> str:
    """
    Build a prompt with explicit, implicit, and strategic intent layers, plus context.
    When require_dxc_positioning is True (default), strategic intent must include
    "position DXC as trusted delivery partner".
    """
    strategic_header = "[STRATEGIC INTENT - DXC POSITIONING]"
    if require_dxc_positioning:
        required_phrase = "position DXC as trusted delivery partner"
        if required_phrase.lower() not in strategic.lower():
            strategic = f"{strategic.strip()}\n{required_phrase}"
    else:
        strategic_header = "[STRATEGIC INTENT]"
    return f"""
[EXPLICIT INTENT]
{explicit}

[IMPLICIT INTENT]
{implicit}

{strategic_header}
{strategic}

[CONTEXT]
{context}
"""
