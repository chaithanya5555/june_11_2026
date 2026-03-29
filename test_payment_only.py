#!/usr/bin/env python3

import sys
import os
sys.path.append('/app')

from backend_test import SnapAlignPaymentTester

def main():
    print("🔥 Running Payment Gateway Tests Only")
    print("=" * 60)
    
    tester = SnapAlignPaymentTester()
    
    # Run payment-specific tests
    return tester.run_payment_tests()

if __name__ == "__main__":
    sys.exit(main())