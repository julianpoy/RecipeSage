import Capacitor

class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TimerAlarmPlugin())
    }
}
