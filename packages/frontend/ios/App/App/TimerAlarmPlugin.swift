import Foundation
import Capacitor
import AlarmKit
import SwiftUI

@available(iOS 26.0, *)
struct TimerAlarmMetadata: AlarmMetadata {}

@objc(TimerAlarmPlugin)
public class TimerAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TimerAlarmPlugin"
    public let jsName = "TimerAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 26.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.unavailable("AlarmKit requires iOS 26")
            return
        }

        Task {
            do {
                let state = try await AlarmManager.shared.requestAuthorization()
                call.resolve(["granted": state == .authorized])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.unavailable("AlarmKit requires iOS 26")
            return
        }
        guard let id = call.getInt("id"),
              let endsAt = call.getDouble("endsAt"),
              let title = call.getString("title"),
              let stopLabel = call.getString("stopLabel"),
              let alarmId = alarmId(for: id) else {
            call.reject("id, endsAt, title and stopLabel are required")
            return
        }

        Task {
            do {
                let alarmManager = AlarmManager.shared
                if try alarmManager.alarms.contains(where: { $0.id == alarmId }) {
                    call.resolve()
                    return
                }

                let attributes = AlarmAttributes<TimerAlarmMetadata>(
                    presentation: AlarmPresentation(alert: alert(title: title, stopLabel: stopLabel)),
                    metadata: TimerAlarmMetadata(),
                    tintColor: Color(red: 0, green: 168 / 255, blue: 1)
                )
                let configuration = AlarmManager.AlarmConfiguration<TimerAlarmMetadata>.alarm(
                    schedule: .fixed(Date(timeIntervalSince1970: endsAt / 1000)),
                    attributes: attributes,
                    sound: .named("timer_alarm.wav")
                )
                _ = try await alarmManager.schedule(id: alarmId, configuration: configuration)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.unavailable("AlarmKit requires iOS 26")
            return
        }
        guard let id = call.getInt("id"), let alarmId = alarmId(for: id) else {
            call.reject("id is required")
            return
        }

        do {
            let alarmManager = AlarmManager.shared
            if try alarmManager.alarms.contains(where: { $0.id == alarmId }) {
                try alarmManager.cancel(id: alarmId)
            }
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    private func alarmId(for id: Int) -> UUID? {
        UUID(uuidString: String(format: "00000000-0000-4000-8000-%012X", id))
    }

    @available(iOS 26.0, *)
    private func alert(title: String, stopLabel: String) -> AlarmPresentation.Alert {
        let titleResource = LocalizedStringResource(String.LocalizationValue(title))
        if #available(iOS 26.1, *) {
            return AlarmPresentation.Alert(title: titleResource)
        }
        let stopButton = AlarmButton(
            text: LocalizedStringResource(String.LocalizationValue(stopLabel)),
            textColor: .white,
            systemImageName: "stop.fill"
        )
        return AlarmPresentation.Alert(title: titleResource, stopButton: stopButton)
    }
}
