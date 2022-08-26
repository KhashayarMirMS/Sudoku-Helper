import { capitalize } from './string';

declare type SerializerMethod = () => any;
declare type DeserializerMethod = (data: any) => void;

export abstract class Serializable {

    protected static ignoredFields: Set<string> = new Set();

    serialize<C extends Serializable>(this: C): string {
        const serialized = Object.fromEntries(Object.entries(this)
            .filter(([key,]) => !this.baseClass.ignoredFields.has(key))
            .map(([key, value]) => {
                const serializerMethod = this.getSerializerMethod<C>(key);

                const valueToSerialize: any = serializerMethod !== undefined ? serializerMethod() : value;

                return [key, valueToSerialize];
            }));

        return JSON.stringify(serialized);
    }

    deserialize<C extends Serializable>(this: C, dataStr: string) {
        const deserialized = JSON.parse(dataStr) as C;

        Object.entries(deserialized)
            .filter(([key,]) => !this.baseClass.ignoredFields.has(key))
            .forEach(([key, value]) => {
                const deserializerMethod = this.getDeserializerMethod(key);

                if (deserializerMethod !== undefined) {
                    deserializerMethod(value);
                    return;
                }

                this[key as keyof C] = value;
            });
    }

    private get baseClass() {
        return this.constructor as typeof Serializable;
    }

    private getSerializerMethod<C extends Serializable>(this: C, key: string): SerializerMethod | undefined {
        const serializerMethodName = `serialize${capitalize(key)}`;

        if (!(serializerMethodName in this)) {
            return undefined;
        }

        const prop = this[serializerMethodName as keyof C];

        if (typeof prop !== 'function') {
            return undefined;
        }

        return (prop as unknown as SerializerMethod).bind(this);
    }

    private getDeserializerMethod<C extends Serializable>(this: C, key: string): DeserializerMethod | undefined {
        const deserializerMethodName = `deserialize${capitalize(key)}`;

        if (!(deserializerMethodName in this)) {
            return undefined;
        }

        const prop = this[deserializerMethodName as keyof C];

        if (typeof prop !== 'function') {
            return undefined;
        }

        return (prop as unknown as DeserializerMethod).bind(this);
    }

}
