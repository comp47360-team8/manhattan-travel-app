//
//  InteractivePopGesture.swift
//  ManhattanTravelApp
//

import UIKit

// Re-enables the edge swipe-to-go-back gesture even when we hide the
// navigation bar's back button (which normally disables it).
extension UINavigationController: UIGestureRecognizerDelegate {

    override open func viewDidLoad() {
        super.viewDidLoad()
        interactivePopGestureRecognizer?.delegate = self
    }

    public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        // Only allow the swipe when there's a screen to go back to.
        viewControllers.count > 1
    }
}
