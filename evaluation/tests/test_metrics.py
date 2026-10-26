import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from metrics import classification, ratio


class MetricTests(unittest.TestCase):
    def test_unknown_is_an_independent_correct_class(self):
        result = classification(['PASS','UNKNOWN','FAIL'], ['PASS','UNKNOWN','FAIL'], ['PASS','FAIL','UNKNOWN'])
        self.assertEqual(result['accuracy'],1)
        self.assertEqual(result['per_class']['UNKNOWN']['tp'],1)
        self.assertEqual(result['per_class']['FAIL']['fp'],0)

    def test_precision_recall_f1_have_explicit_denominators(self):
        result = classification(['yes','yes','no','no'], ['yes','no','yes','no'], ['yes','no'])
        self.assertEqual(result['accuracy'],.5)
        self.assertEqual(result['per_class']['yes']['precision'],.5)
        self.assertEqual(result['per_class']['yes']['recall'],.5)
        self.assertEqual(result['per_class']['yes']['f1'],.5)

    def test_undefined_metric_is_not_invented_score(self):
        result=classification([],[],['PASS','FAIL','UNKNOWN'])
        self.assertIsNone(result['accuracy'])
        self.assertIsNone(result['macro_f1_supported_classes'])
        self.assertIsNone(result['per_class']['PASS']['precision'])
        self.assertIsNone(ratio(0,0))

    def test_abstention_on_known_positive_counts_as_missed_detection(self):
        result=classification(['MISMATCH','CONSISTENT'],['UNKNOWN','CONSISTENT'],['MISMATCH','CONSISTENT'])
        self.assertEqual(result['per_class']['MISMATCH']['fn'],1)
        self.assertEqual(result['per_class']['MISMATCH']['recall'],0)
        self.assertEqual(result['per_class']['MISMATCH']['f1'],0)
        self.assertEqual(result['accuracy'],.5)

    def test_all_positive_predictions_have_correct_false_positive_penalty(self):
        result=classification(['ANSWERED','INSUFFICIENT'],['ANSWERED','ANSWERED'],['ANSWERED','INSUFFICIENT'])
        self.assertEqual(result['per_class']['ANSWERED']['precision'],.5)
        self.assertEqual(result['per_class']['INSUFFICIENT']['recall'],0)
        self.assertEqual(result['per_class']['ANSWERED']['f1'],2/3)

    def test_mismatched_lengths_are_rejected(self):
        with self.assertRaises(ValueError): classification(['PASS'],[],['PASS'])

if __name__ == '__main__': unittest.main()
