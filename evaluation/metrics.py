"""Small transparent metrics with explicit denominators and null undefined ratios."""
from collections import Counter


def ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def classification(gold, predicted, labels):
    if len(gold) != len(predicted):
        raise ValueError('Gold and prediction lengths differ')
    labels = list(dict.fromkeys(list(labels) + list(gold) + list(predicted)))
    matrix = {a: {b: 0 for b in labels} for a in labels}
    for a, b in zip(gold, predicted):
        matrix[a][b] += 1
    per_class = {}
    for label in labels:
        tp = matrix[label][label]
        fp = sum(matrix[a][label] for a in labels if a != label)
        fn = sum(matrix[label][b] for b in labels if b != label)
        per_class[label] = dict(support=sum(matrix[label].values()), tp=tp, fp=fp, fn=fn,
                                precision=ratio(tp, tp+fp), recall=ratio(tp, tp+fn), f1=ratio(2*tp, 2*tp+fp+fn))
    supported = [v['f1'] for v in per_class.values() if v['support'] and v['f1'] is not None]
    return {'n': len(gold), 'correct': sum(a == b for a, b in zip(gold, predicted)),
            'accuracy': ratio(sum(a == b for a, b in zip(gold, predicted)), len(gold)),
            'macro_f1_supported_classes': ratio(sum(supported), len(supported)),
            'gold_counts': dict(Counter(gold)), 'predicted_counts': dict(Counter(predicted)),
            'per_class': per_class, 'confusion_matrix': matrix}
