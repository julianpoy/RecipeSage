import UIKit
import Capacitor
import MindlibCapacitorSendIntent

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    let store = ShareStore.store

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        for context in connectionOptions.urlContexts {
            handleSendIntent(context.url)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)

        for context in URLContexts {
            handleSendIntent(context.url)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    private func handleSendIntent(_ url: URL) {
        guard let components = NSURLComponents(url: url, resolvingAgainstBaseURL: true),
              let params = components.queryItems else {
            return
        }

        let titles = params.filter { $0.name == "title" }
        let descriptions = params.filter { $0.name == "description" }
        let types = params.filter { $0.name == "type" }
        let urls = params.filter { $0.name == "url" }

        guard !titles.isEmpty else { return }

        store.shareItems.removeAll()

        for index in 0...titles.count - 1 {
            var shareItem = JSObject()
            shareItem["title"] = titles[index].value ?? ""
            shareItem["description"] = index < descriptions.count ? (descriptions[index].value ?? "") : ""
            shareItem["type"] = index < types.count ? (types[index].value ?? "") : ""
            shareItem["url"] = index < urls.count ? (urls[index].value ?? "") : ""
            store.shareItems.append(shareItem)
        }

        store.processed = false
        NotificationCenter.default.post(name: Notification.Name("triggerSendIntent"), object: nil)
    }
}
