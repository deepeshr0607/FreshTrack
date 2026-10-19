import Foundation
import Vision
import ImageIO
import CoreGraphics

// No networking, persistence or receipt logging. Only the caller's bounded local image is read.
enum ReceiptLayoutRecognizer {
  enum Failure: Error { case unreadable }

  static func read(_ url: URL) throws -> [[String: Any]] {
    guard url.isFileURL,
          let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize,
          size > 0, size <= 6_000_000,
          let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? NSNumber,
          let height = properties[kCGImagePropertyPixelHeight] as? NSNumber,
          width.doubleValue > 0, height.doubleValue > 0,
          width.doubleValue * height.doubleValue <= 40_000_000,
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: 2000,
            kCGImageSourceCreateThumbnailWithTransform: true,
          ] as CFDictionary) else { throw Failure.unreadable }
    let request = VNRecognizeTextRequest()
    try VNImageRequestHandler(cgImage: image).perform([request])
    var result: [[String: Any]] = []
    var characters = 0
    for observation in request.results ?? [] {
      guard let raw = observation.topCandidates(1).first?.string else { continue }
      let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
      if text.isEmpty { continue }
      characters += text.utf16.count + 1
      guard result.count < 500, text.utf16.count <= 10000, characters <= 50001 else { throw Failure.unreadable }
      let box = observation.boundingBox
      result.append(["id": "line-\(result.count)", "text": text,
        "box": ["x": box.minX, "y": 1 - box.maxY, "width": box.width, "height": box.height]])
    }
    return result
  }
}
