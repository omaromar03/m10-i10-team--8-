"""spaCy-backed entity extraction with recipe keyword fallback."""

from .models import Entity


RECIPE_TERMS = {
    "ginger": "INGREDIENT",
    "garlic": "INGREDIENT",
    "tofu": "INGREDIENT",
    "soy sauce": "INGREDIENT",
    "butter": "INGREDIENT",
    "olive oil": "INGREDIENT",
    "basil": "INGREDIENT",
    "tomato": "INGREDIENT",
    "beef": "INGREDIENT",
    "chicken": "INGREDIENT",
    "shrimp": "INGREDIENT",
    "miso": "INGREDIENT",
    "parmesan": "INGREDIENT",
    "eggs": "INGREDIENT",
    "guanciale": "INGREDIENT",
    "pancetta": "INGREDIENT",
    "sichuan": "CUISINE",
    "italian": "CUISINE",
    "thai": "CUISINE",
    "japanese": "CUISINE",
    "french": "CUISINE",
    "stir-frying": "TECHNIQUE",
    "braising": "TECHNIQUE",
    "roasting": "TECHNIQUE",
    "simmering": "TECHNIQUE",
    "sauteing": "TECHNIQUE",
}


def extract_entities(text: str, nlp) -> list[Entity]:
    doc = nlp(text)

    entities: list[Entity] = [
        Entity(text=e.text, label=e.label_, start=e.start_char, end=e.end_char)
        for e in doc.ents
    ]

    lower_text = text.lower()

    for term, label in RECIPE_TERMS.items():
        start = 0
        while True:
            index = lower_text.find(term, start)
            if index == -1:
                break

            end = index + len(term)

            overlaps = any(
                not (end <= entity.start or index >= entity.end)
                for entity in entities
            )

            if not overlaps:
                entities.append(
                    Entity(
                        text=text[index:end],
                        label=label,
                        start=index,
                        end=end,
                    )
                )

            start = end

    entities.sort(key=lambda entity: entity.start)
    return entities