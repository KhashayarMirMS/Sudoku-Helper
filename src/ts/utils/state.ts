import { Serializable } from './serializable';

declare type Listener<Model> = (newState: Model) => void;

declare type ListenerMap<Model> = Map<string | Listener<Model>, Listener<Model>>;

interface Listenable<Model> {
    addListener(listener: Listener<Model>): void
    removeListener(listener: Listener<Model>): void
    notifyListeners(): void
}

declare type callbackFunction = () => void;

interface Syncable<Model> {
    sync(update: Partial<Model>): void
    atomic(callback: callbackFunction): void
    silent(callback: callbackFunction): void
}

export class State<Model extends State<Model>> extends Serializable implements Listenable<Model>, Syncable<Model> {

    protected static ignoredFields = new Set<string>([
        'listeners',
        'shouldSync',
    ]);

    private static internalFields = Object.getOwnPropertyNames(new State<never>());

    private static proxyHandler: ProxyHandler<State<any>> = {
        get(target: State<any>, key: keyof State<any>) {
            return target[key];
        },
        set(target: State<any>, key: keyof State<any>, value: any) {
            target[key] = value;

            if (!State.internalFields.includes(key)) {
                target.notifyListeners();
            }

            return true;
        }
    };

    private listeners: ListenerMap<Model> = new Map();

    private shouldSync = true;

    constructor() {
        super();

        if (State.proxyHandler === undefined) {
            // constructing helper object
            return;
        }

        // eslint-disable-next-line consistent-return, no-constructor-return
        return new Proxy(this, State.proxyHandler);
    }

    addListener(this: Model, listener: Listener<Model>, strKey?: string) {
        const key = strKey === undefined ? listener : strKey;
        this.listeners.set(key, listener);
    }

    removeListener(key: string | Listener<Model>) {
        this.listeners.delete(key);
    }

    notifyListeners(this: Model) {
        if (!this.shouldSync) {
            return;
        }

        for (const listener of this.listeners.values()) {
            listener(this);
        }
    }

    sync(this: Model, update: Partial<Model>) {
        for (const keyStr of Object.keys(update)) {
            const key = keyStr as keyof Model;

            const value = update[keyStr as keyof Model];
            if (value === undefined) {
                continue;
            }

            (this as unknown as Model)[key] = value as Model[keyof Model];
        }

        this.notifyListeners();
    }

    atomic(this: Model, callback: callbackFunction): void {
        // funny code :D
        this.silent(callback);
        this.notifyListeners();
    }

    silent(this: Model, callback: callbackFunction): void {
        const previousShouldSync = this.shouldSync;
        this.shouldSync = false;
        callback();
        this.shouldSync = previousShouldSync;
    }

}
