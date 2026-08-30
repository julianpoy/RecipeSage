import MobileCoreServices
import Social
import UIKit
import UniformTypeIdentifiers

private let appUrlScheme = "recipesage"
private let appGroupId = "group.com.recipesage.ios"

class ShareItem {
    public var title: String?
    public var type: String?
    public var url: String?
}

class ShareViewController: UIViewController {

    private var shareItems: [ShareItem] = []

    override public func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
    }

    private func sendData() {
        let queryItems = shareItems.map {
            [
                URLQueryItem(name: "title", value: $0.title ?? ""),
                URLQueryItem(name: "description", value: ""),
                URLQueryItem(name: "type", value: $0.type ?? ""),
                URLQueryItem(name: "url", value: $0.url ?? ""),
            ]
        }.flatMap({ $0 })
        var urlComps = URLComponents(string: "\(appUrlScheme)://")!
        urlComps.queryItems = queryItems
        openURL(urlComps.url!)
    }

    fileprivate func createSharedFileUrl(_ url: URL?) -> String {
        let fileManager = FileManager.default

        let copyFileUrl =
            fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)!
            .absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)! + url!
            .lastPathComponent.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        try? fileManager.removeItem(at: URL(string: copyFileUrl)!)
        try? fileManager.copyItem(at: url!, to: URL(string: copyFileUrl)!)

        return copyFileUrl
    }

    func saveScreenshot(_ image: UIImage, _ index: Int) -> String {
        let fileManager = FileManager.default

        let copyFileUrl =
            fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)!
            .absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
            + "/screenshot_\(index).png"
        do {
            try image.pngData()?.write(to: URL(string: copyFileUrl)!)
            return copyFileUrl
        } catch {
            print(error.localizedDescription)
            return ""
        }
    }

    func saveData(_ data: Data, _ fileName: String) -> String {
        let fileManager = FileManager.default

        let copyFileUrl =
            fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)!
            .absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
            + fileName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        do {
            try data.write(to: URL(string: copyFileUrl)!)
            return copyFileUrl
        } catch {
            print(error.localizedDescription)
            return ""
        }
    }

    fileprivate func handleTypeUrl(_ attachment: NSItemProvider)
        async throws -> ShareItem?
    {
        let results = try await attachment.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil)
        let shareItem: ShareItem = ShareItem()

        if let url = results as? URL {
            if url.isFileURL {
                shareItem.title = url.lastPathComponent
                shareItem.type = "application/" + url.pathExtension.lowercased()
                shareItem.url = createSharedFileUrl(url)
            } else {
                shareItem.title = url.absoluteString
                shareItem.url = url.absoluteString
                shareItem.type = "text/plain"
            }
            return shareItem
        }

        if let string = results as? String {
            shareItem.title = string
            shareItem.url = string
            shareItem.type = "text/plain"
            return shareItem
        }

        return nil
    }

    fileprivate func handleTypeText(_ attachment: NSItemProvider)
        async throws -> ShareItem
    {
        let results = try await attachment.loadItem(forTypeIdentifier: kUTTypeText as String, options: nil)
        let shareItem: ShareItem = ShareItem()
        let text = results as! String
        shareItem.title = text
        shareItem.type = "text/plain"
        return shareItem
    }

    fileprivate func handleTypeImage(_ attachment: NSItemProvider, _ index: Int)
        async throws -> ShareItem
    {
        let data = try await attachment.loadItem(forTypeIdentifier: kUTTypeImage as String, options: nil)

        let shareItem: ShareItem = ShareItem()
        switch data {
        case let image as UIImage:
            shareItem.title = "screenshot_\(index)"
            shareItem.type = "image/png"
            shareItem.url = self.saveScreenshot(image, index)
        case let url as URL:
            shareItem.title = url.lastPathComponent
            shareItem.type = "image/" + url.pathExtension.lowercased()
            shareItem.url = self.createSharedFileUrl(url)
        default:
            print("Unexpected image data:", type(of: data))
        }
        return shareItem
    }

    fileprivate func handleTypeData(_ attachment: NSItemProvider)
        async throws -> ShareItem
    {
        let results = try await attachment.loadItem(forTypeIdentifier: kUTTypeData as String, options: nil)
        let shareItem: ShareItem = ShareItem()

        switch results {
        case let url as URL:
            shareItem.title = url.lastPathComponent
            let ext = url.pathExtension.lowercased()
            shareItem.type = ext.isEmpty ? "application/octet-stream" : "application/" + ext
            shareItem.url = self.createSharedFileUrl(url)
        case let data as Data:
            let fileName = "shared_\(UUID().uuidString)"
            shareItem.title = fileName
            shareItem.type = "application/octet-stream"
            shareItem.url = self.saveData(data, "/" + fileName)
        default:
            print("Unexpected data:", type(of: results))
        }
        return shareItem
    }

    override public func viewDidLoad() {
        super.viewDidLoad()

        shareItems.removeAll()

        let inputItems = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let attachments = inputItems.flatMap { $0.attachments ?? [] }

        Task {
            try await withThrowingTaskGroup(
                of: ShareItem?.self,
                body: { taskGroup in

                    for (index, attachment) in attachments.enumerated() {
                        if attachment.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
                            taskGroup.addTask {
                                return try? await self.handleTypeUrl(attachment)
                            }
                        } else if attachment.hasItemConformingToTypeIdentifier(kUTTypeImage as String) {
                            taskGroup.addTask {
                                return try? await self.handleTypeImage(attachment, index)
                            }
                        } else if attachment.hasItemConformingToTypeIdentifier(kUTTypeData as String) {
                            taskGroup.addTask {
                                return try? await self.handleTypeData(attachment)
                            }
                        } else if attachment.hasItemConformingToTypeIdentifier(kUTTypeText as String) {
                            taskGroup.addTask {
                                return try? await self.handleTypeText(attachment)
                            }
                        }
                    }

                    for try await item in taskGroup {
                        if let item = item {
                            self.shareItems.append(item)
                        }
                    }
                })

            self.shareItems.sort { first, second in
                let firstHasUrl = !(first.url?.isEmpty ?? true)
                let secondHasUrl = !(second.url?.isEmpty ?? true)
                return firstHasUrl && !secondHasUrl
            }

            self.sendData()
        }
    }

    @objc func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }
    }
}
