// Compile with the actual native ReceiptLayoutRecognizer.swift; PUBLIC local evaluation only.
import Foundation
@main struct ReceiptLayoutEvaluation {
  static func main() {
    guard CommandLine.arguments.count == 3 else {
      print("Usage: receipt-layout-evaluate INPUT OUTPUT_JSON"); exit(1)
    }
    do {
      let boxes = try ReceiptLayoutRecognizer.read(URL(fileURLWithPath: CommandLine.arguments[1]))
      try JSONSerialization.data(withJSONObject: boxes, options: [.prettyPrinted, .sortedKeys])
        .write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
      print("Recognized \(boxes.count) positioned strings")
    } catch { print("Local receipt recognition failed"); exit(1) }
  }
}
