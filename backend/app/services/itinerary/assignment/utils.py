from datetime import timedelta, date

def convert_to_days(date_range: list[date]):
    if len(date_range) == 1:
        return [date_range[0].weekday()]

    if date_range[1] - date_range[0] == timedelta(days=1):
        return [d.weekday() for d in date_range]

    trip_days = []

    difference = date_range[1] - date_range[0]
    for i in range(difference.days + 1):
        trip_days.append((date_range[0].weekday() + i) % 7)

    return trip_days

def number_of_weeks(days: list):
    return (len(days) // 7) + 1

def split_evenly(total: int, parts: int):
    base = total // parts
    remainder = total % parts
    return [base + (1 if i < remainder else 0) for i in range(parts)]

def normalize_cost(cost: float, costs: list, sign: str):
    minimum = min(costs)
    maximum = max(costs)

    if maximum == minimum:
        return 0
    if sign == "positive":
        return (cost - minimum) / (maximum - minimum)
    elif sign == "negative":
        return (maximum - cost) / (maximum - minimum)
