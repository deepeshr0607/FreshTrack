import Foundation
import ExpoModulesCore

public class FreshTrackReceiptLayoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FreshTrackReceiptLayout")
    AsyncFunction("recognize") { (url: URL) throws -> [String: Any] in
      do {
        let boxes = try ReceiptLayoutRecognizer.read(url)
        return ["lines": boxes.compactMap { $0["text"] as? String }, "boxes": boxes]
      } catch {
        // Do not expose file paths, receipt contents or framework internals to JS/native logs.
        throw Exception(name: "RECEIPT_READ", description: "The local receipt image could not be read.")
      }
    }
  }
}
